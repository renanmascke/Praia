import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getBrazilToday } from '@/lib/date-utils';

import { getSystemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Configurações e Variáveis de Ambiente
// (Adicione novas constantes de limites aqui se necessário)

function toUtcEpochSecondsFromHourlyKey(timeStr: string): number {
    // timeStr comes like "YYYY-MM-DD HH:MM" (stored by sync-weather)
    const iso = timeStr.replace(' ', 'T') + ':00Z';
    return Math.floor(new Date(iso).getTime() / 1000);
}

async function checkAndIncrementQuota(provider: string, limit: number) {
    const today = getBrazilToday();
    const quota = await (prisma as any).apiQuota.upsert({
        where: { provider_date: { provider, date: today } },
        update: {},
        create: { provider, date: today, maxLimit: limit }
    });
    if (quota.count >= limit) return false;
    await prisma.apiQuota.update({
        where: { id: quota.id },
        data: { count: { increment: 1 } }
    });
    return true;
}

export async function runMarineSync(silent: boolean = false, runId?: string) {
    const actualRunId = runId || crypto.randomUUID();
    const syncDaysStr = await getSystemConfig('WEATHER_SYNC_DAYS', '8');
    const syncDays = parseInt(syncDaysStr) || 8;

    console.log(`>>> SYNC MARINE INICIADO [RUN: ${actualRunId}] (Tábua Maré + OpenMeteo) para ${syncDays} dias <<<`);
    const logId = crypto.randomUUID();

    // Criar Log de Início
    await (prisma as any).syncLog.create({
        data: {
            id: logId,
            runId: actualRunId,
            type: 'MARINE',
            startTime: new Date(),
            status: 'RUNNING',
            message: `Iniciando [STEP: marine] para ${syncDays} dias...`
        }
    });

    try {
        const anchors = await prisma.forecastAnchor.findMany({
            include: { city: true }
        });
        
        const brazilToday = getBrazilToday();
        let apiCalls = 0;

        for (const anchor of anchors) {
            const lat = anchor.latitude;
            const lng = anchor.longitude;
            const state = (anchor.city as any)?.state?.toLowerCase() || 'sc';

            // 1. OPEN-METEO (Ondas)
            const startDate = brazilToday.toISOString().split('T')[0];
            const endDateObj = new Date(brazilToday);
            endDateObj.setUTCDate(endDateObj.getUTCDate() + (syncDays - 1));
            const endDate = endDateObj.toISOString().split('T')[0];

            const omUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_direction,wave_period&timezone=America%2FSao_Paulo&start_date=${startDate}&end_date=${endDate}`;
            
            const omRes = await fetch(omUrl);
            const omData = await omRes.json();
            apiCalls++;
            await checkAndIncrementQuota('OPEN_METEO', 10000);

            // 2. TÁBUA DE MARÉS (Níveis)
            // Agrupar dias por mês para minimizar chamadas
            const daysByMonth = new Map<number, number[]>();
            for (let i = 0; i < syncDays; i++) {
                const d = new Date(brazilToday);
                d.setUTCDate(brazilToday.getUTCDate() + i);
                const month = d.getUTCMonth() + 1;
                const day = d.getUTCDate();
                if (!daysByMonth.has(month)) daysByMonth.set(month, []);
                daysByMonth.get(month)!.push(day);
            }

            const tidePoints: { time: string, level: number }[] = [];
            for (const [month, days] of Array.from(daysByMonth.entries())) {
                const daysStr = `[${days.join(',')}]`;
                const tideUrl = `https://tabuamare.devtu.qzz.io/api/v2/geo-tabua-mare/[${lat},${lng}]/${state}/${month}/${daysStr}`;
                const tideRes = await fetch(tideUrl);
                if (tideRes.ok) {
                    const tideJson = await tideRes.json();
                    apiCalls++;
                    await checkAndIncrementQuota('TABUA_MARE', 1000);
                    
                    // Extrair pontos da resposta
                    for (const harbor of tideJson.data || []) {
                        for (const m of harbor.months || []) {
                            for (const d of m.days || []) {
                                for (const h of d.hours || []) {
                                    // h.hour é "HH:MM:SS", d.day, m.month, harbor.year
                                    const dateStr = `${harbor.year}-${String(m.month).padStart(2,'0')}-${String(d.day).padStart(2, '0')}T${h.hour}Z`;
                                    tidePoints.push({ time: dateStr, level: h.level });
                                }
                            }
                        }
                    }
                }
            }

            // 3. ATUALIZAR BANCO (HORA A HORA)
            for (let i = 0; i < syncDays; i++) {
                const targetDate = new Date(brazilToday);
                targetDate.setUTCDate(targetDate.getUTCDate() + i);
                targetDate.setUTCHours(0, 0, 0, 0);
                const targetDateStr = targetDate.toISOString().split('T')[0];

                const existing = await prisma.weatherForecast.findUnique({
                    where: { anchorId_date: { anchorId: anchor.id, date: targetDate } }
                });

                if (existing && existing.hourlyData) {
                    const newHourly = (existing.hourlyData as any[]).map((h: any) => {
                        const hTimeStr = String(h.time); // "YYYY-MM-DD HH:MM"
                        const hTimeIso = hTimeStr.replace(' ', 'T') + ':00Z';
                        const hTime = new Date(hTimeIso).getTime();

                        // Match OpenMeteo Ondas
                        // OpenMeteo time is "YYYY-MM-DDTHH:MM" local (SP) but starts from 00:00
                        const omIdx = omData.hourly?.time?.findIndex((t: string) => t.startsWith(hTimeStr.replace(' ', 'T')));
                        
                        // Match Tábua de Marés (Ponto mais próximo em um range de 3h)
                        const closestTide = tidePoints.reduce((prev, curr) => {
                            const currTime = new Date(curr.time).getTime();
                            const prevTime = prev ? new Date(prev.time).getTime() : Infinity;
                            const diffCurr = Math.abs(currTime - hTime);
                            const diffPrev = Math.abs(prevTime - hTime);
                            return diffCurr < diffPrev ? curr : prev;
                        }, null as any);

                        const tideVal = (closestTide && Math.abs(new Date(closestTide.time).getTime() - hTime) < 3 * 3600 * 1000)
                            ? closestTide.level : h.tideLevel;

                        return {
                            ...h,
                            waveHeight: omIdx !== -1 ? omData.hourly?.wave_height?.[omIdx] || 0 : h.waveHeight || 0,
                            waveDirection: omIdx !== -1 ? omData.hourly?.wave_direction?.[omIdx] || 0 : h.waveDirection || 0,
                            wavePeriod: omIdx !== -1 ? omData.hourly?.wave_period?.[omIdx] || 0 : h.wavePeriod || 0,
                            tideLevel: tideVal
                        };
                    });

                    await prisma.weatherForecast.update({
                        where: { id: existing.id },
                        data: { hourlyData: newHourly }
                    });
                }
            }
        }

        const finalMessage = `Sucesso: [STEP: marine] migrado. (${apiCalls} chamadas externas).`;
        await (prisma as any).syncLog.update({
            where: { id: logId },
            data: {
                endTime: new Date(),
                status: 'SUCCESS',
                message: finalMessage,
                response: { apiCalls }
            }
        });

        if (!silent) {
            await sendAdminNotification(`🌊 <b>Sincronização Marítima (Nova API)</b>\n\nStatus: Sucesso ✅\nFontes: Tábua Maré + OpenMeteo\nChamadas: ${apiCalls}`);
        }

        return { success: true, apiCalls, finished: false, nextStep: 'math', runId: actualRunId };

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC MARINE NOVO <<<", error);
        if (!silent) {
            await sendAdminNotification(`❌ <b>ERRO NO SYNC MAR (Nova API)</b>\n\nErro: ${error.message}`);
        }
        await (prisma as any).syncLog.update({
            where: { id: logId },
            data: {
                endTime: new Date(),
                status: 'FAILED',
                message: error.message
            }
        });
        return { success: false, error: error.message, runId: actualRunId };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const silent = searchParams.get('silent') === 'true';
    const runId = searchParams.get('runId') || undefined;
    const result = await runMarineSync(silent, runId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
