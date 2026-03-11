import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings } from '@/lib/ranking';
import { getSystemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY;

// Limites configurados
const STORMGLASS_DAILY_LIMIT = 10;
const WEATHERAPI_MONTHLY_LIMIT = 10000000;

async function checkAndIncrementQuota(provider: string, limit: number) {
    const today = getBrazilToday();

    const quota = await (prisma as any).apiQuota.upsert({
        where: { provider_date: { provider, date: today } },
        update: {},
        create: { provider, date: today, maxLimit: limit }
    });

    if (quota.count >= limit) {
        return false;
    }

    await prisma.apiQuota.update({
        where: { id: quota.id },
        data: { count: { increment: 1 } }
    });

    return true;
}

export async function runWeatherSync(silent: boolean = false, runId?: string) {
    if (!WEATHER_API_KEY) {
        throw new Error("WEATHER_API_KEY não configurada no .env");
    }

    const actualRunId = runId || crypto.randomUUID();
    console.log(`>>> SYNC WEATHER INICIADO [RUN: ${actualRunId}] <<<`);
    const logId = crypto.randomUUID();
    const startTime = new Date();

    // 0. Limpeza de logs "travados" (mais de 15 min em RUNNING)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale'
        WHERE status = 'RUNNING' AND type = 'WEATHER' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // 0.1. Trava de concorrência
    const activeSync = await prisma.syncLog.findFirst({
        where: { type: 'WEATHER', status: 'RUNNING', startTime: { gte: new Date(Date.now() - 15 * 60 * 1000) } }
    });

    if (activeSync) {
        console.warn(">>> WEATHER SYNC ABORTADO: Já existe uma sincronização em andamento.");
        if (!silent) {
            await sendAdminNotification(`⚠️ *Sync Clima Abortado*\n\nMotivo: Já existe outra sincronização em andamento.`);
        }
        return { success: false, error: "Outra sincronização de Clima já está em andamento." };
    }

    // Pegar horizonte de dias configurado
    const syncDaysStr = await getSystemConfig('WEATHER_SYNC_DAYS', '8');
    const syncDays = parseInt(syncDaysStr) || 8;

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt, runId)
        VALUES ('${logId}', 'WEATHER', NOW(), 'RUNNING', 'Iniciando sincronização de Clima (WeatherAPI) para ${syncDays} dias...', NOW(), '${actualRunId}')
    `);

    try {
        const anchors = await prisma.forecastAnchor.findMany();
        if (anchors.length === 0) throw new Error("Nenhum Ponto de Referência cadastrado.");

        let totalInserted = 0;
        let weatherCalls = 0;

        console.log(`>>> Sincronizando Clima para HOJE + ${syncDays - 1} dias.`);

        for (const anchor of anchors) {
            if (await checkAndIncrementQuota('WEATHERAPI', WEATHERAPI_MONTHLY_LIMIT)) {
                const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${anchor.latitude},${anchor.longitude}&days=${syncDays}&aqi=no&alerts=no&lang=pt`;
                const res = await fetch(weatherUrl);

                if (res.ok) {
                    const weatherData = await res.json();
                    weatherCalls++;

                    if (weatherData && weatherData.forecast) {
                        for (const day of weatherData.forecast.forecastday) {
                            const targetDate = new Date(`${day.date}T00:00:00.000Z`);

                            // Preservar dados de mar existentes se houver
                            const existing = await prisma.weatherForecast.findUnique({
                                where: { anchorId_date: { anchorId: anchor.id, date: targetDate } }
                            });

                            const hourlyDataPoints = day.hour.map((h: any, idx: number) => {
                                const existingHour = (existing?.hourlyData as any[])?.[idx];
                                return {
                                    time: h.time,
                                    temp: h.temp_c,
                                    condition: h.condition.text,
                                    windSpeed: h.wind_kph,
                                    windDir: h.wind_dir,
                                    // Manter dados de mar se já existirem no banco
                                    waveHeight: existingHour?.waveHeight || 0,
                                    waveDirection: existingHour?.waveDirection || 0,
                                    wavePeriod: existingHour?.wavePeriod || 0
                                };
                            });

                            // Escolha do ícone inteligente para persistência
                            const rainChance = day.day.daily_chance_of_rain;
                            const rainAmount = day.day.totalprecip_mm;
                            const hourlyWithRain = day.hour.find((h: any) =>
                                h.condition.text.toLowerCase().includes('chuva') ||
                                h.condition.text.toLowerCase().includes('aguaceiro') ||
                                h.condition.text.toLowerCase().includes('garoa')
                            );

                            const middayIcon = day.hour[12]?.condition.icon || day.day.condition.icon;
                            let selectedIcon = (rainChance > 50 || rainAmount > 2)
                                ? (hourlyWithRain?.condition.icon || middayIcon)
                                : middayIcon;

                            if (selectedIcon?.startsWith('//')) {
                                selectedIcon = `https:${selectedIcon}`;
                            }

                            await prisma.weatherForecast.upsert({
                                where: { anchorId_date: { anchorId: anchor.id, date: targetDate } },
                                update: {
                                    condition: day.day.condition.text,
                                    tempMax: day.day.maxtemp_c,
                                    tempMin: day.day.mintemp_c,
                                    rainChance: day.day.daily_chance_of_rain,
                                    rainAmount: day.day.totalprecip_mm,
                                    windDir: day.hour[12]?.wind_dir || 'NE',
                                    windSpeed: day.day.maxwind_kph,
                                    hourlyData: hourlyDataPoints,
                                    icon: selectedIcon
                                },
                                create: {
                                    anchorId: anchor.id,
                                    date: targetDate,
                                    condition: day.day.condition.text,
                                    tempMax: day.day.maxtemp_c,
                                    tempMin: day.day.mintemp_c,
                                    rainChance: day.day.daily_chance_of_rain,
                                    rainAmount: day.day.totalprecip_mm,
                                    windDir: day.hour[12]?.wind_dir || 'NE',
                                    windSpeed: day.day.maxwind_kph,
                                    hourlyData: hourlyDataPoints,
                                    icon: selectedIcon
                                }
                            });
                            totalInserted++;
                        }
                    }
                }
            }
        }

        const finalMessage = `Sucesso: [STEP: weather] concluído. (${weatherCalls} chamadas WeatherAPI para ${syncDays} dias).`;

        // Log final no banco
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog
            SET endTime = NOW(), status = 'SUCCESS', message = '${finalMessage}', response = '{"weatherCalls":${weatherCalls}}'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🌦️ <b>Sincronização de Clima Concluída</b>\n\nStatus: Sucesso ✅\nChamadas: ${weatherCalls}`);
        }

        return { success: true, weather: weatherCalls, finished: false, nextStep: 'marine', runId: actualRunId };

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC WEATHER CORE <<<", error);

        if (!silent) {
            await sendAdminNotification(`❌ <b>ERRO NO SYNC CLIMA</b>\n\nErro: ${error.message}`);
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
    const result = await runWeatherSync(silent, runId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
