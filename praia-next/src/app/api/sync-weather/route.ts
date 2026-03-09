import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const silent = searchParams.get('silent') === 'true';
    const logId = crypto.randomUUID();
    const startTime = new Date();

    if (!WEATHER_API_KEY) {
        throw new Error("WEATHER_API_KEY não configurada no .env");
    }

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'WEATHER', NOW(), 'RUNNING', 'Iniciando sincronização de Clima (WeatherAPI)...', NOW())
    `);

    try {
        const anchors = await prisma.forecastAnchor.findMany();
        if (anchors.length === 0) throw new Error("Nenhum Ponto de Referência cadastrado.");

        let totalInserted = 0;
        let weatherCalls = 0;

        for (const anchor of anchors) {
            if (await checkAndIncrementQuota('WEATHERAPI', WEATHERAPI_MONTHLY_LIMIT)) {
                const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${anchor.latitude},${anchor.longitude}&days=3&aqi=no&alerts=no&lang=pt`;
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
                                    hourlyData: hourlyDataPoints
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
                                    hourlyData: hourlyDataPoints
                                }
                            });
                            totalInserted++;
                        }
                    }
                }
            }
        }

        const finalMessage = `Sucesso: ${weatherCalls} chamadas WeatherAPI concluídas.`;

        // Log final no banco
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog
            SET endTime = NOW(), status = 'SUCCESS', message = '${finalMessage}', response = '{"weatherCalls":${weatherCalls}}'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🌦️ *Sincronização de Clima Concluída*\n\nStatus: Sucesso ✅\nChamadas: ${weatherCalls}`);
        }

        return NextResponse.json({ success: true, weather: weatherCalls });

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC WEATHER <<<", error);

        if (!silent) {
            await sendAdminNotification(`❌ *ERRO NO SYNC CLIMA*\n\nErro: ${error.message}`);
        }

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
