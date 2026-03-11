import prisma from './prisma';
import { beachWhitelist } from './data';
import { addSyncStep } from './sync-logger';
import { getSystemConfig } from './system-config';

function logWithTime(msg: string) {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR');
    console.log(`[${time}] ${msg}`);
}

export async function getRankingSteps() {
    const syncDaysStr = await getSystemConfig('RANKING_SYNC_DAYS', '4');
    const syncDays = parseInt(syncDaysStr) || 4;
    const aiBlocksCount = Math.ceil(syncDays / 2); // 2 dias por bloco
    
    const steps = ['math'];
    for (let i = 0; i < aiBlocksCount; i++) {
        steps.push(`ai-block-${i}`);
    }
    steps.push('summary');
    steps.push('highlight');
    return steps;
}

export async function getGlobalSteps() {
    const rankingSteps = await getRankingSteps();
    return ['ima', 'weather', 'marine', ...rankingSteps];
}

/**
 * Detecta qual o próximo passo pendente para um runId
 */
export async function getNextPendingStep(runId: string, pipeline: string[]) {
    // Nota: 'pipeline' agora deve ser passado já resolvido (fetch dinâmico se necessário no chamador)
    const logs = await prisma.syncLog.findMany({
        where: { runId, status: 'SUCCESS' },
        select: { message: true }
    });

    for (const step of pipeline) {
        // Buscamos a marcação [STEP: name] na mensagem do log de sucesso
        const stepDone = logs.some(l => l.message?.includes(`[STEP: ${step}]`));
        if (!stepDone) return step;
    }
    return null;
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

export async function triggerGlobalRankingUpdate(logId?: string, step?: string) {
    const stepLabel = step ? `[STEP: ${step}]` : "(LEGACY ALL-IN-ONE)";
    logWithTime(`>>> DISPARANDO ATUALIZAÇÃO GLOBAL DE RANKINGS ${stepLabel}...`);
    
    const { getBrazilToday } = await import('./date-utils');
    const cities = await prisma.city.findMany();

    const syncDaysStr = await getSystemConfig('RANKING_SYNC_DAYS', '4');
    const syncDays = parseInt(syncDaysStr) || 4;

    const datesToRank = [getBrazilToday()];
    for (let i = 1; i < syncDays; i++) {
        const d = new Date(datesToRank[0]);
        d.setUTCDate(d.getUTCDate() + i);
        datesToRank.push(d);
    }

    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    for (const city of cities) {
        logWithTime(`>>> [CITY: ${city.name}] Processando etapa: ${step || 'full'}`);
        const beaches = await prisma.beach.findMany({ where: { cityId: city.id } });

        // ETAPA: CÁLCULO MATEMÁTICO (Base)
        if (!step || step === 'math') {
            logWithTime(`>>> [CITY: ${city.name}] Executando cálculos matemáticos...`);
            if (logId) await addSyncStep(logId, `[${city.name}] Calculando scores matemáticos para ${datesToRank.length} dias.`);
            await runInChunks(datesToRank, 2, (date) => generateDailyRankings(city.id, date, logId));
        }

        // ETAPAS: LOTES DE IA (2 dias por vez)
        if (!step || step.startsWith('ai-block-')) {
            if (geminiKey) {
                const blockIdx = step ? parseInt(step.replace('ai-block-', '')) : -1;
                
                // Agrupar datas em blocos de 2 para processamento pela IA
                const allBlocks: Date[][] = [];
                for (let i = 0; i < datesToRank.length; i += 2) {
                    allBlocks.push(datesToRank.slice(i, i + 2));
                }

                const blocksToProcess = blockIdx === -1 ? allBlocks : [allBlocks[blockIdx]];

                for (let bIdx = 0; bIdx < blocksToProcess.length; bIdx++) {
                    const batchDates = blocksToProcess[bIdx];
                    if (!batchDates || batchDates.length === 0) continue;

                    const effectiveIdx = blockIdx === -1 ? bIdx : blockIdx;
                    logWithTime(`>>> [CITY: ${city.name}] Solicitando Lote IA ${effectiveIdx + 1} (${batchDates.length} dias)...`);
                    if (logId) await addSyncStep(logId, `[${city.name}] Solicitando Lote IA ${effectiveIdx + 1} para ${batchDates.length} dias.`);
                    
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
                        
                        // Reordenar imediatamente após a IA desse bloco
                        for (const date of batchDates) {
                            await reorderCityRankings(city.id, date);
                        }
                        
                        logWithTime(`>>> [CITY: ${city.name}] Lote IA ${effectiveIdx + 1} e Reordenação concluídos.`);
                        if (logId) await addSyncStep(logId, `[${city.name}] Lote IA ${effectiveIdx + 1} concluído e reordenado.`);
                    } catch (error: any) {
                        console.error(`>>> ERRO NO LOTE IA ${effectiveIdx + 1}:`, error.message);
                        if (logId) await addSyncStep(logId, `[${city.name}] ERRO no Lote IA ${effectiveIdx + 1}: ${error.message}`);
                    }
                }
            }
        }

        // ETAPA: RESUMOS DIÁRIOS (Boletins)
        if (!step || step === 'summary') {
            logWithTime(`>>> [CITY: ${city.name}] Gerando resumos diários finais...`);
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
                        
                        // Descobrir a melhor região (anchorId da praia #1)
                        const bestBeach = await prisma.beach.findUnique({
                            where: { id: sortedRankings[0]?.beachId }
                        });

                        if (summaryContent) {
                            await (prisma as any).cityDailySummary.upsert({
                                where: { cityId_date: { cityId: city.id, date } },
                                update: { 
                                    content: summaryContent,
                                    bestAnchorId: bestBeach?.anchorId || null
                                },
                                create: { 
                                    cityId: city.id, 
                                    date, 
                                    content: summaryContent,
                                    bestAnchorId: bestBeach?.anchorId || null
                                }
                            });
                        }
                    } catch (e) {
                        console.error("Erro no resumo:", e);
                    }
                }
            });
        }

        // ETAPA FINAL: DESTAQUE (Escolha do Melhor Dia pela IA)
        if (!step || step === 'highlight') {
            logWithTime(`>>> [CITY: ${city.name}] Elegendo o Melhor Dia do período...`);
            if (logId) await addSyncStep(logId, `[${city.name}] Analisando boletins para eleger o Melhor Dia.`);

            try {
                // Buscar todos os sumários recentes desta cidade
                const allSummaries = await prisma.cityDailySummary.findMany({
                    where: { cityId: city.id, date: { in: datesToRank } },
                    orderBy: { date: 'asc' }
                });

                if (allSummaries.length > 0) {
                    const { selectBestDay } = await import('./gemini');
                    const summariesForAi = allSummaries.map(s => ({
                        date: s.date.toISOString().split('T')[0],
                        content: s.content || ""
                    }));

                    const bestDateStr = await selectBestDay(city.name, summariesForAi);
                    
                    if (bestDateStr) {
                        const bestDate = new Date(bestDateStr + 'T00:00:00Z');
                        
                        // Resetar destaques anteriores para este período
                        await (prisma as any).cityDailySummary.updateMany({
                            where: { cityId: city.id, date: { in: datesToRank } },
                            data: { isBest: false }
                        });

                        // Marcar o novo campeão
                        await (prisma as any).cityDailySummary.update({
                            where: { cityId_date: { cityId: city.id, date: bestDate } },
                            data: { isBest: true }
                        });

                        logWithTime(`>>> [CITY: ${city.name}] Melhor dia eleito: ${bestDateStr}`);
                        if (logId) await addSyncStep(logId, `[${city.name}] Melhor dia eleito pela IA: ${bestDateStr}`);
                    }
                }
            } catch (e) {
                console.error("Erro ao destacar melhor dia:", e);
                if (logId) await addSyncStep(logId, `[${city.name}] Erro ao eleger melhor dia: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
            }
        }
    }

    logWithTime(`>>> ATUALIZAÇÃO GLOBAL DE RANKINGS ${stepLabel} CONCLUÍDA.`);
}
