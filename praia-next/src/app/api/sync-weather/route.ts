import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getBrazilToday } from '@/lib/date-utils';

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

export async function GET() {
    const logId = crypto.randomUUID();
    const startTime = new Date();

    if (!WEATHER_API_KEY) {
        throw new Error("WEATHER_API_KEY não configurada no .env");
    }

    // Criar Log de Início via Raw SQL
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'WEATHER', NOW(), 'RUNNING', 'Iniciando sincronização com controle de quota...', NOW())
    `);

    try {
        const anchors = await prisma.forecastAnchor.findMany();
        if (anchors.length === 0) throw new Error("Nenhum Ponto de Referência cadastrado.");

        let totalInserted = 0;
        let weatherCalls = 0;
        let sgCalls = 0;
        let sgLimitReached = false;

        for (const anchor of anchors) {
            // 1. WeatherAPI (Sempre tenta, limite alto)
            let weatherData: any = null;
            if (await checkAndIncrementQuota('WEATHERAPI', WEATHERAPI_MONTHLY_LIMIT)) {
                const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${anchor.latitude},${anchor.longitude}&days=3&aqi=no&alerts=no&lang=pt`;
                const res = await fetch(weatherUrl);
                if (res.ok) {
                    weatherData = await res.json();
                    weatherCalls++;
                }
            }

            // 2. StormGlass (Controle Rigoroso)
            let marineData: any = null;
            if (STORMGLASS_API_KEY && !sgLimitReached) {
                if (await checkAndIncrementQuota('STORMGLASS', STORMGLASS_DAILY_LIMIT)) {
                    const sgUrl = `https://api.stormglass.io/v2/weather/point?lat=${anchor.latitude}&lng=${anchor.longitude}&params=waveHeight,waveDirection,wavePeriod&source=sg`;
                    const sgRes = await fetch(sgUrl, {
                        headers: { 'Authorization': STORMGLASS_API_KEY }
                    });

                    if (sgRes.status === 200) {
                        marineData = await sgRes.json();
                        sgCalls++;
                    } else if (sgRes.status === 402 || sgRes.status === 403) {
                        sgLimitReached = true;
                        await sendAdminNotification(`⚠️ *Limite Diário StormGlass atingido!* (${STORMGLASS_DAILY_LIMIT}/10). A sincronização de mar foi pausada.`);
                    }
                } else {
                    sgLimitReached = true;
                }
            }

            // 3. Processamento
            if (weatherData && weatherData.forecast) {
                for (const day of weatherData.forecast.forecastday) {
                    const targetDate = new Date(`${day.date}T00:00:00.000Z`);

                    const hourlyDataPoints = day.hour.map((h: any) => {
                        const hTime = new Date(h.time).getTime() / 1000;
                        const marine = marineData?.hours?.find((mh: any) => {
                            const mt = new Date(mh.time).getTime() / 1000;
                            return Math.abs(mt - hTime) < 1800;
                        });

                        return {
                            time: h.time,
                            temp: h.temp_c,
                            condition: h.condition.text,
                            windSpeed: h.wind_kph,
                            windDir: h.wind_dir,
                            waveHeight: marine?.waveHeight?.sg || 0,
                            waveDirection: marine?.waveDirection?.sg || 0,
                            wavePeriod: marine?.wavePeriod?.sg || 0
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

        const statsMsg = `✅ *Sincronização Concluída*\n🌍 Pontos: ${anchors.length}\n🌦️ WeatherAPI: ${weatherCalls}\n🌊 StormGlass: ${sgCalls}`;
        await sendAdminNotification(statsMsg);

        const finalStatus = sgLimitReached ? 'PARTIAL' : 'SUCCESS';
        const finalMessage = sgLimitReached
            ? `Parcial: ${weatherCalls} weather, cota StormGlass esgotada.`
            : `Sucesso: ${weatherCalls} weather, ${sgCalls} marine.`;

        // Log final no banco
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog
            SET endTime = NOW(), status = '${finalStatus}', message = '${finalMessage}', response = '{"weather":${weatherCalls},"marine":${sgCalls},"sgLimitReached":${sgLimitReached}}'
            WHERE id = '${logId}'
        `);

        return NextResponse.json({ success: true, status: finalStatus, weather: weatherCalls, marine: sgCalls, sgLimitReached });

    } catch (error: any) {
        await sendAdminNotification(`❌ *ERRO NA SINCRONIZAÇÃO*\n${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
