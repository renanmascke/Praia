import prisma from './prisma';
import { beachWhitelist } from './data';

function logWithTime(msg: string) {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR');
    console.log(`[${time}] ${msg}`);
}

interface RankingScore {
    beachId: string;
    score: number;
    status: string;
    totalPoints: number;
    proprioCount: number;
    improprioCount: number;
    aiCommentary?: string | null;
}

/**
 * Calcula o score de uma praia com base nos microclimas e condições atuais
 */
export async function calculateBeachScore(beach: any, forecast: any, report: any): Promise<number> {
    let score = 0;

    // 1. Microclima / Vento Ideal (40 pts)
    if (forecast && beach.idealWind) {
        const currentWindDir = forecast.windDir;
        const idealWinds = beach.idealWind.split(',').map((w: string) => w.trim());

        if (idealWinds.includes(currentWindDir)) {
            score += 40; // Proteção máxima
        } else {
            score += 10;
        }
    }

    // 2. Balneabilidade (30 pts)
    if (report) {
        // Indeterminado não deve ser prejudicado, recebe a mesma pontuação de Própria
        if (report.status === 'Própria' || report.status === 'Indeterminado') {
            score += 30;
        } else if (report.status === 'Mista') {
            score += 10;
        }
        // Imprópria = 0
    } else {
        score += 15;
    }

    // 3. Ondulação (20 pts)
    if (forecast && forecast.hourlyData) {
        const hours = (forecast.hourlyData as any[]) || [];
        const avgWave = hours.length > 0
            ? hours.reduce((acc, h) => acc + (h.waveHeight || 0), 0) / hours.length
            : 0;

        if (avgWave < 0.6) {
            score += 20;
        } else if (avgWave < 1.2) {
            score += 10;
        }
    }

    // 4. Céu (10 pts)
    if (forecast) {
        const condition = forecast.condition.toLowerCase();
        if (condition.includes('sol') || condition.includes('limpo') || condition.includes('céu aberto')) {
            score += 10;
        } else if (condition.includes('nublado')) {
            score += 5;
        }
    }

    return score;
}

/**
 * Gera e salva o ranking de todas as praias para uma cidade e data específica
 */
/**
 * Gera dados de praias para serem processados pela IA
 */
async function prepareBeachDataForAi(cityId: string, date: Date, beaches: any[]) {
    const anchorIds = Array.from(new Set(beaches.map(b => b.anchorId).filter(id => !!id))) as string[];
    const forecasts = await prisma.weatherForecast.findMany({
        where: { anchorId: { in: anchorIds }, date }
    });

    const beachIds = beaches.map(b => b.id);
    const reports = await prisma.report.findMany({
        where: { beachId: { in: beachIds } },
        orderBy: { date: 'desc' }
    });

    return beaches.map(beach => {
        const forecast = forecasts.find(f => f.anchorId === beach.anchorId);
        const report = reports.find(r => r.beachId === beach.id);

        return {
            beachId: beach.id,
            name: beach.name,
            idealWind: beach.idealWind,
            forecast: forecast ? {
                condition: forecast.condition,
                windDir: forecast.windDir,
                waveHeight: (forecast.hourlyData as any[])?.[12]?.waveHeight || 0
            } : null,
            report: report ? {
                status: report.status,
                lastUpdate: report.date
            } : null
        };
    });
}

/**
 * Salva o ranking individual (sem chamada de IA, pois ela agora é em lote)
 */
export async function generateDailyRankings(cityId: string, date: Date, logId?: string) {
    const datePrefix = `[${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}]`;
    logWithTime(`${datePrefix} >>> CALCULANDO SCORES MATEMÁTICOS: Cidade ${cityId}`);

    const beaches = await prisma.beach.findMany({
        where: { cityId },
        include: { anchor: true }
    });

    if (beaches.length === 0) return;

    const anchorIds = Array.from(new Set(beaches.map(b => b.anchorId).filter(id => !!id))) as string[];
    const forecasts = await prisma.weatherForecast.findMany({
        where: { anchorId: { in: anchorIds }, date }
    });

    const beachIds = beaches.map(b => b.id);
    const reports = await prisma.report.findMany({
        where: { beachId: { in: beachIds } },
        orderBy: { date: 'desc' }
    });

    const results: RankingScore[] = [];

    for (const beach of beaches) {
        const forecast = forecasts.find(f => f.anchorId === beach.anchorId);
        const report = reports.find(r => r.beachId === beach.id);

        const mathScore = await calculateBeachScore(beach, forecast, report);
        results.push({
            beachId: beach.id,
            score: mathScore,
            status: report?.status || 'Indeterminado',
            totalPoints: report?.pts || 0,
            proprioCount: report?.pPts || 0,
            improprioCount: report?.improprios || 0,
            aiCommentary: null
        });
    }

    // Ordenação inicial (será refinada pela IA depois)
    const sorted = results.sort((a, b) => b.score - a.score);

    const upsertPromises = sorted.map((item, i) => (prisma as any).beachRanking.upsert({
        where: { beachId_date: { beachId: item.beachId, date } },
        update: { score: item.score, position: i + 1, status: item.status, totalPoints: item.totalPoints, proprioCount: item.proprioCount, improprioCount: item.improprioCount },
        create: { beachId: item.beachId, date, score: item.score, position: i + 1, status: item.status, totalPoints: item.totalPoints, proprioCount: item.proprioCount, improprioCount: item.improprioCount }
    }));

    await prisma.$transaction(upsertPromises);
}

/**
 * Função para injetar os resultados da IA em lote no banco
 */
async function applyAiRankingBatch(cityId: string, aiResults: any[]) {
    for (const res of aiResults) {
        // Forçar data para UTC 00:00:00 para evitar desvio de fuso
        const date = new Date(res.date + 'T00:00:00Z');
        
        // Usamos upsert para ser resiliente: se o cálculo matemático falhou ou não criou o registro, a IA cria.
        await (prisma as any).beachRanking.upsert({
            where: { beachId_date: { beachId: res.beachId, date } },
            update: {
                score: res.score,
                aiCommentary: res.commentary
            },
            create: {
                beachId: res.beachId,
                date,
                score: res.score,
                aiCommentary: res.commentary,
                position: 99, // Provisório, será ordenado na leitura
                status: 'Indeterminado',
                totalPoints: 0,
                proprioCount: 0,
                improprioCount: 0
            }
        });
    }
}

/**
 * Reordena as posições do ranking de uma cidade em uma data com base nos scores refinados
 */
async function reorderCityRankings(cityId: string, date: Date) {
    const rankings = await prisma.beachRanking.findMany({
        where: { beachId: { in: (await prisma.beach.findMany({ where: { cityId }, select: { id: true } })).map(b => b.id) }, date },
        orderBy: { score: 'desc' }
    });

    const updates = rankings.map((r, i) => (prisma as any).beachRanking.update({
        where: { beachId_date: { beachId: r.beachId, date } },
        data: { position: i + 1 }
    }));

    await prisma.$transaction(updates);
}

/**
 * Utilitário para rodar promessas em blocos (chunks) para controlar concorrência
 */
async function runInChunks<T, R>(items: T[], chunkSize: number, callback: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(callback));
        results.push(...chunkResults);
    }
    return results;
}

export async function triggerGlobalRankingUpdate(logId?: string) {
    logWithTime(">>> DISPARANDO ATUALIZAÇÃO GLOBAL DE RANKINGS (SUPER PARALLEL + THROTTLED)...");
    const { getBrazilToday } = await import('./date-utils');
    const cities = await prisma.city.findMany();

    const datesToRank = [getBrazilToday()];
    for (let i = 1; i <= 7; i++) {
        const d = new Date(datesToRank[0]);
        // Usar setUTCDate para garantir que o incremento não mude o fuso horário
        d.setUTCDate(d.getUTCDate() + i);
        datesToRank.push(d);
    }

    for (const city of cities) {
        logWithTime(`>>> PROCESSANDO CIDADE: ${city.name}`);
        const beaches = await prisma.beach.findMany({ where: { cityId: city.id } });

        // ETAPA 1: Cálculos Matemáticos (Chunked de 2 em 2 dias para não estourar pool de 5 conexões)
        logWithTime(`>>> [CITY: ${city.name}] Etapa 1: Cálculos matemáticos (chunk size: 2)...`);
        await runInChunks(datesToRank, 2, (date) => generateDailyRankings(city.id, date, logId));

        // ETAPA 2: IA em Lotes (Esses são apenas 2 lotes e passam a maior parte do tempo fora do DB, podem ser paralelos)
        const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (geminiKey) {
            logWithTime(`>>> [CITY: ${city.name}] Etapa 2: Solicitando lotes Gemini em paralelo...`);
            const batches = [datesToRank.slice(0, 4), datesToRank.slice(4, 8)];

            const aiBatchPromises = batches.map(async (batchDates, bIdx) => {
                const batchDataForAi: any[] = [];
                for (const date of batchDates) {
                    const dailyBeaches = await prepareBeachDataForAi(city.id, date, beaches);
                    batchDataForAi.push({
                        date: date.toISOString().split('T')[0],
                        beaches: dailyBeaches
                    });
                }

                try {
                    const { generateMultiDayRanking } = await import('./gemini');
                    const aiResults = await generateMultiDayRanking(city.name, batchDataForAi);
                    await applyAiRankingBatch(city.id, aiResults);
                    logWithTime(`>>> [CITY: ${city.name}] Lote IA ${bIdx + 1} concluído.`);
                } catch (error: any) {
                    console.error(`>>> ERRO NO LOTE IA ${bIdx + 1}:`, error.message);
                }
            });

            await Promise.all(aiBatchPromises);
        }

        // ETAPA 3: Reordenação de Posições (Após IA ter mudado os scores)
        logWithTime(`>>> [CITY: ${city.name}] Etapa 3: Reordenando posições pós-IA...`);
        const reorderPromises = datesToRank.map(date => reorderCityRankings(city.id, date));
        await Promise.all(reorderPromises);

        // ETAPA 4: Resumos Diários (Chunked de 2 em 2 dias)
        logWithTime(`>>> [CITY: ${city.name}] Etapa 4: Gerando resumos diários (chunk size: 2)...`);
        await runInChunks(datesToRank, 2, async (date) => {
            const sortedRankings = await prisma.beachRanking.findMany({
                where: { beachId: { in: beaches.map(b => b.id) }, date },
                orderBy: { score: 'desc' },
                take: 5
            });

            const forecasts = await prisma.weatherForecast.findMany({
                where: { anchorId: { in: beaches.map(b => b.anchorId).filter(id => !!id) as string[] }, date }
            });

            if (forecasts.length > 0) {
                try {
                    const { generateCityDailySummary } = await import('./gemini');
                    const weatherSummary = forecasts.map(f => {
                        const hours = (f.hourlyData as any[]) || [];
                        const getP = (s: number, e: number) => {
                            const p = hours.filter(h => h.time >= s && h.time <= e);
                            if (p.length === 0) return { condition: f.condition, rainChance: f.rainChance || 0, windSpeed: 0, windDir: f.windDir };
                            return {
                                condition: p[Math.floor(p.length/2)].condition,
                                rainChance: Math.max(...p.map(h => h.rainChance || 0)),
                                windSpeed: p.reduce((acc, h) => acc + (h.windSpeed || 0), 0) / p.length,
                                windDir: p[Math.floor(p.length/2)].windDir
                            };
                        };
                        return {
                            anchorName: f.anchorId,
                            dailyMax: f.tempMax,
                            periods: {
                                morning: getP(6, 11),
                                afternoon: getP(12, 17),
                                night: getP(18, 23)
                            }
                        };
                    });

                    const topRankings = sortedRankings.map(r => ({
                        beachId: r.beachId,
                        score: r.score,
                        commentary: r.aiCommentary
                    }));

                    const summaryContent = await generateCityDailySummary(city.name, weatherSummary, topRankings);
                    if (summaryContent) {
                        await (prisma as any).cityDailySummary.upsert({
                            where: { cityId_date: { cityId: city.id, date } },
                            update: { content: summaryContent },
                            create: { cityId: city.id, date, content: summaryContent }
                        });
                    }
                } catch (e) {
                    console.error("Erro no resumo:", e);
                }
            }
        });
    }

    logWithTime(">>> ATUALIZAÇÃO GLOBAL DE RANKINGS CONCLUÍDA.");
}
