import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getBrazilToday } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY;
const STORMGLASS_DAILY_LIMIT = 10;

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
    if (!STORMGLASS_API_KEY) {
        throw new Error("STORMGLASS_API_KEY não configurada no .env");
    }

    const actualRunId = runId || crypto.randomUUID();
    console.log(`>>> SYNC MARINE INICIADO [RUN: ${actualRunId}] <<<`);
    const logId = crypto.randomUUID();
    const startTime = new Date();

    // 0. Limpeza de logs "travados"
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale'
        WHERE status = 'RUNNING' AND type = 'MARINE' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, runId, type, startTime, status, message, createdAt)
        VALUES ('${logId}', '${actualRunId}', 'MARINE', NOW(), 'RUNNING', 'Iniciando [STEP: marine]...', NOW())
    `);

    try {
        const anchors = await prisma.forecastAnchor.findMany();
        let sgCalls = 0;
        let sgLimitReached = false;

        for (const anchor of anchors) {
            if (sgLimitReached) break;

            if (await checkAndIncrementQuota('STORMGLASS', STORMGLASS_DAILY_LIMIT)) {
                const sgUrl = `https://api.stormglass.io/v2/weather/point?lat=${anchor.latitude}&lng=${anchor.longitude}&params=waveHeight,waveDirection,wavePeriod&source=sg`;
                const sgRes = await fetch(sgUrl, {
                    headers: { 'Authorization': STORMGLASS_API_KEY }
                });

                if (sgRes.status === 200) {
                    const marineData = await sgRes.json();
                    sgCalls++;

                    for (let i = 0; i < 8; i++) {
                        const targetDate = new Date();
                        targetDate.setUTCDate(targetDate.getUTCDate() + i);
                        targetDate.setUTCHours(0, 0, 0, 0);

                        const existing = await prisma.weatherForecast.findUnique({
                            where: { anchorId_date: { anchorId: anchor.id, date: targetDate } }
                        });

                        if (existing && existing.hourlyData) {
                            const newHourly = (existing.hourlyData as any[]).map((h: any) => {
                                const hTime = new Date(h.time).getTime() / 1000;
                                const marine = marineData?.hours?.find((mh: any) => {
                                    const mt = new Date(mh.time).getTime() / 1000;
                                    return Math.abs(mt - hTime) < 1800;
                                });

                                return {
                                    ...h,
                                    waveHeight: marine?.waveHeight?.sg || h.waveHeight || 0,
                                    waveDirection: marine?.waveDirection?.sg || h.waveDirection || 0,
                                    wavePeriod: marine?.wavePeriod?.sg || h.wavePeriod || 0
                                };
                            });

                            await prisma.weatherForecast.update({
                                where: { id: existing.id },
                                data: { hourlyData: newHourly }
                            });
                        }
                    }
                } else if (sgRes.status === 402 || sgRes.status === 403) {
                    sgLimitReached = true;
                }
            } else {
                sgLimitReached = true;
            }
        }

        const finalStatus = sgLimitReached ? 'PARTIAL' : 'SUCCESS';
        const finalMessage = `Sucesso: [STEP: marine] concluído. (${sgCalls} chamadas StormGlass).`;

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = '${finalStatus}', message = '${finalMessage}', response = '{"sgCalls":${sgCalls},"limitReached":${sgLimitReached}}'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🌊 <b>Sincronização de Mar Concluída</b>\n\nStatus: ${finalStatus} ${sgLimitReached ? '⚠️' : '✅'}\nChamadas: ${sgCalls}`);
        }

        return { success: true, marine: sgCalls, limitReached: sgLimitReached, finished: false, nextStep: 'math', runId: actualRunId };

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC MARINE CORE <<<", error);

        if (!silent) {
            await sendAdminNotification(`❌ <b>ERRO NO SYNC MAR</b>\n\nErro: ${error.message}`);
        }

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);
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
