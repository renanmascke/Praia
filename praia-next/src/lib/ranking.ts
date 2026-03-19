import prisma from './prisma';
import { beachWhitelist } from './data';
import { addSyncStep } from './sync-logger';
import { getSystemConfig } from './system-config';
import { Prisma } from '@prisma/client';

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
    // Busca logs com status SUCCESS, RUNNING (em andamento) ou PARTIAL (concluído parcialmente)
    // para evitar re-execução de passos que ainda estão rodando
    const logs = await prisma.syncLog.findMany({
        where: { runId, status: { in: ['SUCCESS', 'RUNNING', 'PARTIAL'] } },
        select: { message: true }
    });

    const doneSteps = new Set<string>();
    for (const l of logs) {
        const msg = l.message || '';
        const m = msg.match(/\[STEP:\s*([^\]]+)\]/);
        if (m?.[1]) doneSteps.add(m[1].trim());
    }

    for (const step of pipeline) {
        if (!doneSteps.has(step)) return step;
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
        const currentWindDir = String(forecast.windDir || '').trim().toUpperCase();
        const windSpeed = Number(forecast.windSpeed || 0);
        const idealWinds = String(beach.idealWind)
            .split(',')
            .map((w: string) => w.trim().toUpperCase())
            .filter(Boolean);

        if (idealWinds.includes(currentWindDir)) {
            score += 40; // Proteção máxima
        } else if (windSpeed < 5) {
            score += 35; // Vento quase nulo: mar espelhado, direção não importa
        } else if (windSpeed < 10) {
            score += 15; // Vento fraco mas existente: já começa a incomodar se for de frente
        } else if (windSpeed < 15) {
            score -= 5; // Vento moderado leve: se não é ideal, já é um ponto negativo
        } else if (windSpeed < 22) {
            score -= 25; // Moderado: atrapalha bastante se não é o ideal
        } else if (windSpeed < 30) {
            score -= 45; // Vento forte fora do ideal: estraga a experiência
        } else {
            score -= 60; // Muito forte: inviável
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

    // 4. Céu e Chuva (10 pts base + penalidade)
    if (forecast) {
        const condition = forecast.condition.toLowerCase();
        if (condition.includes('sol') || condition.includes('limpo') || condition.includes('céu aberto')) {
            score += 10;
        } else if (condition.includes('nublado')) {
            score += 5;
        }

        // Penalidade por Chuva Forte (pode zerar o score se for muito alta)
        if (forecast.rainChance > 50 || forecast.rainAmount > 4) {
            score -= 40;
        } else if (forecast.rainChance > 30 || forecast.rainAmount > 1) {
            score -= 15;
        }

        // Diferenciação fina por temperatura/vento para evitar empates matemáticos
        score += (forecast.tempMax * 0.1); 
        score -= (Number(forecast.windSpeed || 0) * 0.02);
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

    const forecastByAnchorId = new Map<string, any>();
    for (const f of forecasts) forecastByAnchorId.set((f as any).anchorId, f);

    const latestReportByBeachId = new Map<string, any>();
    for (const r of reports) {
        const beachId = (r as any).beachId;
        if (!latestReportByBeachId.has(beachId)) latestReportByBeachId.set(beachId, r);
    }

    return beaches.map(beach => {
        const forecast = beach.anchorId ? forecastByAnchorId.get(beach.anchorId) : undefined;
        const report = latestReportByBeachId.get(beach.id);

        return {
            beachId: beach.id,
            name: beach.name,
            idealWind: beach.idealWind,
            forecast: forecast ? {
                condition: forecast.condition,
                windDir: forecast.windDir,
                windSpeed: forecast.windSpeed,
                rainChance: forecast.rainChance,
                rainAmount: forecast.rainAmount,
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

    const forecastByAnchorId = new Map<string, any>();
    for (const f of forecasts) forecastByAnchorId.set((f as any).anchorId, f);

    const latestReportByBeachId = new Map<string, any>();
    for (const r of reports) {
        const beachId = (r as any).beachId;
        if (!latestReportByBeachId.has(beachId)) latestReportByBeachId.set(beachId, r);
    }

    const results: RankingScore[] = [];

    for (const beach of beaches) {
        const forecast = beach.anchorId ? forecastByAnchorId.get(beach.anchorId) : undefined;
        const report = latestReportByBeachId.get(beach.id);

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
    if (!aiResults || aiResults.length === 0) return;

    // Batch upsert em uma única query para reduzir latência (DB remoto).
    // Observação: `id` não tem default no MySQL (é gerado no client pelo Prisma),
    // então para inserts via SQL usamos `UUID()`.
    const rows = aiResults.map((res: any) => {
        const dateStr = String(res.date); // esperado: YYYY-MM-DD
        return Prisma.sql`(UUID(), ${res.beachId}, ${dateStr}, ${Number(res.score)}, ${res.commentary ?? null}, 99, 'Indeterminado', 0, 0, 0, NOW(), NOW())`;
    });

    await prisma.$executeRaw(
        Prisma.sql`
            INSERT INTO BeachRanking
                (id, beachId, date, score, aiCommentary, position, status, totalPoints, proprioCount, improprioCount, createdAt, updatedAt)
            VALUES ${Prisma.join(rows)}
            ON DUPLICATE KEY UPDATE
                score = VALUES(score),
                aiCommentary = VALUES(aiCommentary),
                updatedAt = NOW()
        `
    );
}

/**
 * Reordena as posições do ranking de uma cidade em uma data com base nos scores refinados
 */
async function reorderCityRankings(cityId: string, date: Date, beachIds: string[]) {
    const rankings = await prisma.beachRanking.findMany({
        where: { beachId: { in: beachIds }, date },
        orderBy: { score: 'desc' },
        select: { beachId: true }
    });

    if (rankings.length === 0) return;

    // Atualizar posições em lote (1 round-trip) usando CASE WHEN.
    // Isso reduz drasticamente o tempo em DB remoto.
    const whenClauses = rankings.map((r, i) => Prisma.sql`WHEN ${r.beachId} THEN ${i + 1}`);
    const ids = rankings.map(r => r.beachId);
    const dateStr = dateKey(date);

    const cases = Prisma.join(whenClauses, ' ');
    await prisma.$executeRaw(
        Prisma.sql`
            UPDATE BeachRanking
            SET position = CASE beachId
                ${cases}
                ELSE position
            END,
            updatedAt = NOW()
            WHERE date = ${dateStr} AND beachId IN (${Prisma.join(ids)})
        `
    );
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

function dateKey(date: Date) {
    return date.toISOString().split('T')[0];
}

function keyAnchorDate(anchorId: string, date: Date) {
    return `${anchorId}|${dateKey(date)}`;
}

function hourFromHourlyKeyUtc(timeStr: string): number | null {
    // timeStr stored like "YYYY-MM-DD HH:MM"
    const iso = timeStr.replace(' ', 'T') + ':00Z';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.getUTCHours();
}

function summarizePeriodFromHourly(hours: any[], startHour: number, endHour: number) {
    const slice = hours.filter((h: any) => {
        const hr = hourFromHourlyKeyUtc(String(h.time || ''));
        return hr !== null && hr >= startHour && hr <= endHour;
    });
    if (slice.length === 0) return null;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const windSpeeds = slice.map(h => Number(h.windSpeed || 0));
    const waveHeights = slice.map(h => Number(h.waveHeight || 0));
    const rainChances = slice.map(h => Number(h.rainChance || 0)).filter(n => Number.isFinite(n));
    const tideLevels = slice.map(h => (h.tideLevel === null || h.tideLevel === undefined) ? null : Number(h.tideLevel)).filter(v => v !== null && Number.isFinite(v as number)) as number[];

    // mode-ish for windDir
    const dirCounts = new Map<string, number>();
    for (const h of slice) {
        const dir = String(h.windDir || '').trim().toUpperCase();
        if (!dir) continue;
        dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
    }
    let windDir: string | null = null;
    let best = -1;
    for (const [dir, c] of Array.from(dirCounts.entries())) {
        if (c > best) { best = c; windDir = dir; }
    }

    return {
        windSpeedAvg: Number(avg(windSpeeds).toFixed(1)),
        windSpeedMax: Number(Math.max(...windSpeeds).toFixed(1)),
        windDir,
        rainChanceMax: rainChances.length ? Math.max(...rainChances) : null,
        waveHeightAvg: Number(avg(waveHeights).toFixed(2)),
        waveHeightMax: Number(Math.max(...waveHeights).toFixed(2)),
        wavePeriodAvg: Number(avg(slice.map(h => Number(h.wavePeriod || 0))).toFixed(1)),
        tideAvg: tideLevels.length ? Number(avg(tideLevels).toFixed(2)) : null,
        tideMin: tideLevels.length ? Number(Math.min(...tideLevels).toFixed(2)) : null,
        tideMax: tideLevels.length ? Number(Math.max(...tideLevels).toFixed(2)) : null
    };
}

function normalizeWindDir8(dir: string | null | undefined): string | null {
    const d = String(dir || '').trim().toUpperCase();
    if (!d) return null;
    // Reduce 16-point to 8-point where possible
    if (d.includes('N') && d.includes('E')) return 'NE';
    if (d.includes('S') && d.includes('E')) return 'SE';
    if (d.includes('S') && d.includes('W')) return 'SW';
    if (d.includes('N') && d.includes('W')) return 'NW';
    if (d.includes('N')) return 'N';
    if (d.includes('E')) return 'E';
    if (d.includes('S')) return 'S';
    if (d.includes('W')) return 'W';
    return d;
}

function parseIdealWindSet(idealWind: string | null | undefined): Set<string> {
    const parts = String(idealWind || '')
        .split(',')
        .map(s => normalizeWindDir8(s))
        .filter(Boolean) as string[];
    return new Set(parts);
}

function pickRecommendedByPeriod(
    ranked: any[],
    period: any | null,
    limit: number
): { name: string; score: number; position: number; fit: 'good' | 'ok' | 'bad' }[] {
    if (!ranked || ranked.length === 0) return [];
    const windDir = normalizeWindDir8(period?.windDir);
    const windSpeedAvg = Number(period?.windSpeedAvg || 0);

    const scored = ranked.map((r: any) => {
        const idealSet = parseIdealWindSet(r.beach?.idealWind);
        const hasDir = windDir ? idealSet.has(windDir) : false;
        let fit: 'good' | 'ok' | 'bad' = 'ok';

        if (windSpeedAvg >= 18) {
            fit = hasDir ? 'good' : 'bad';
        } else if (windSpeedAvg >= 10) {
            fit = hasDir ? 'good' : 'bad'; // Vento frontal acima de 10km/h já é considerado ruim
        } else if (windSpeedAvg >= 5) {
            fit = hasDir ? 'good' : 'ok';
        } else {
            fit = 'good'; // Vento muito fraco é bom em qualquer lugar
        }

        return {
            name: r.beach?.name,
            score: r.score,
            position: r.position,
            fit
        };
    }).filter((x: any) => !!x.name);

    // Prefer good fits when wind is relevant; otherwise use ranking order.
    scored.sort((a, b) => {
        const fitRank = (f: string) => (f === 'good' ? 0 : f === 'ok' ? 1 : 2);
        const fr = fitRank(a.fit) - fitRank(b.fit);
        if (fr !== 0) return fr;
        return a.position - b.position;
    });

    return scored.slice(0, limit);
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
        if (beaches.length === 0) continue;

        const beachIds = beaches.map(b => b.id);
        const anchorIds = Array.from(new Set(beaches.map(b => b.anchorId).filter((id): id is string => !!id)));

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
                    
                    // Prefetch forecasts for all dates in this batch (single round-trip)
                    const batchForecasts = await prisma.weatherForecast.findMany({
                        where: { anchorId: { in: anchorIds }, date: { in: batchDates } }
                    });
                    const forecastByAnchorDate = new Map<string, any>();
                    for (const f of batchForecasts) {
                        forecastByAnchorDate.set(keyAnchorDate((f as any).anchorId, (f as any).date), f);
                    }

                    // Prefetch reports once and keep latest per beachId (single round-trip)
                    const reports = await prisma.report.findMany({
                        where: { beachId: { in: beachIds } },
                        orderBy: { date: 'desc' }
                    });
                    const latestReportByBeachId = new Map<string, any>();
                    for (const r of reports) {
                        const id = (r as any).beachId;
                        if (!latestReportByBeachId.has(id)) latestReportByBeachId.set(id, r);
                    }

                    const batchDataForAi: any[] = [];
                    for (const date of batchDates) {
                        const dKey = dateKey(date);
                        const dailyBeaches = beaches.map(beach => {
                            const forecast = beach.anchorId ? forecastByAnchorDate.get(`${beach.anchorId}|${dKey}`) : undefined;
                            const report = latestReportByBeachId.get(beach.id);
                            const hourly = ((forecast as any)?.hourlyData as any[]) || [];
                            const morning = summarizePeriodFromHourly(hourly, 6, 11);
                            const afternoon = summarizePeriodFromHourly(hourly, 12, 17);

                            return {
                                beachId: beach.id,
                                name: beach.name,
                                region: beach.region,
                                idealWind: beach.idealWind,
                                forecast: forecast ? {
                                    condition: (forecast as any).condition,
                                    windDir: (forecast as any).windDir,
                                    windSpeed: (forecast as any).windSpeed,
                                    rainChance: (forecast as any).rainChance,
                                    rainAmount: (forecast as any).rainAmount,
                                    waveHeight: ((forecast as any).hourlyData as any[])?.[12]?.waveHeight || 0,
                                    periods: {
                                        morning,
                                        afternoon
                                    }
                                } : null,
                                report: report ? {
                                    status: (report as any).status,
                                    totalPoints: (report as any).pts ?? 0,
                                    proprioCount: (report as any).pPts ?? 0,
                                    improprioCount: (report as any).improprios ?? 0,
                                    lastUpdate: (report as any).date
                                } : null
                            };
                        });
                        batchDataForAi.push({
                            date: dKey,
                            beaches: dailyBeaches
                        });
                    }

                    try {
                        const { generateMultiDayRanking } = await import('./gemini');
                        const aiResults = await generateMultiDayRanking(city.name, batchDataForAi);
                        await applyAiRankingBatch(city.id, aiResults);
                        
                        // Reordenar imediatamente após a IA desse bloco
                        for (const date of batchDates) {
                            await reorderCityRankings(city.id, date, beachIds);
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
                    where: { beachId: { in: beachIds }, date },
                    include: { beach: { select: { name: true, anchorId: true, idealWind: true, region: true } } },
                    orderBy: { score: 'desc' },
                    take: 12
                });

                const forecasts = await prisma.weatherForecast.findMany({
                    where: { anchorId: { in: anchorIds }, date }
                });

                if (forecasts.length > 0) {
                    try {
                        const { generateCityDailySummary } = await import('./gemini');
                        const weatherSummary = forecasts.map(f => {
                            const hours = (f.hourlyData as any[]) || [];
                            const getP = (s: number, e: number) => {
                                const p = hours.filter(h => h.time >= s && h.time <= e);
                                if (p.length === 0) {
                                    return {
                                        condition: f.condition,
                                        rainChance: f.rainChance || 0,
                                        windSpeed: f.windSpeed || 0,
                                        windDir: f.windDir
                                    };
                                }
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
                            name: (r as any).beach.name,
                            score: r.score,
                            commentary: r.aiCommentary
                        }));

                        // Melhor "região/ponto" do dia: anchorId da praia #1 do ranking (para escolha do forecast no app)
                        const bestAnchorId = (sortedRankings as any[])?.[0]?.beach?.anchorId || null;
                        const bestAnchorForecast = bestAnchorId
                            ? forecasts.find(f => (f as any).anchorId === bestAnchorId)
                            : undefined;

                        const bestAnchorPeriods = bestAnchorForecast
                            ? (() => {
                                const hours = ((bestAnchorForecast as any).hourlyData as any[]) || [];
                                return {
                                    morning: summarizePeriodFromHourly(hours, 6, 11),
                                    afternoon: summarizePeriodFromHourly(hours, 12, 17)
                                };
                            })()
                            : null;

                        // Recomendações determinísticas por período (evita IA recomendar vento frontal fora do ideal)
                        const morningRec = pickRecommendedByPeriod(sortedRankings, bestAnchorPeriods?.morning ?? null, 5);
                        const afternoonRec = pickRecommendedByPeriod(sortedRankings, bestAnchorPeriods?.afternoon ?? null, 5);

                        const summaryContent = await generateCityDailySummary(
                            city.name,
                            weatherSummary,
                            topRankings,
                            {
                                bestAnchorId,
                                bestAnchorPeriods,
                                recommended: {
                                    morning: morningRec,
                                    afternoon: afternoonRec
                                }
                            }
                        );

                        if (summaryContent) {
                            await (prisma as any).cityDailySummary.upsert({
                                where: { cityId_date: { cityId: city.id, date } },
                                update: { 
                                    content: summaryContent,
                                    bestAnchorId
                                },
                                create: { 
                                    cityId: city.id, 
                                    date, 
                                    content: summaryContent,
                                    bestAnchorId
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
            if (logId) await addSyncStep(logId, `[${city.name}] Analisando boletins futuros para eleger o Melhor Dia.`);

            try {
                const { getBrazilToday } = await import('./date-utils');
                const today = getBrazilToday();

                // Buscar todos os sumários de HOJE em diante desta cidade (não apenas os processados neste loop)
                const allSummaries = await prisma.cityDailySummary.findMany({
                    where: { 
                        cityId: city.id, 
                        date: { gte: today } 
                    },
                    orderBy: { date: 'asc' },
                    take: 10 // Limitar a um horizonte razoável de 10 dias
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
                        
                        // Resetar destaques anteriores para este período futuro
                        await (prisma as any).cityDailySummary.updateMany({
                            where: { 
                                cityId: city.id, 
                                date: { gte: today } 
                            },
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
