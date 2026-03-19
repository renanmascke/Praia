import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getBrazilToday } from '@/lib/date-utils';
import { getSystemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY;
const GOOGLE_WEATHER_MONTHLY_LIMIT = 10000; 

function degreesToCardinal(degrees: number) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

async function checkAndIncrementQuota(provider: string, limit: number) {
    const today = getBrazilToday();
    try {
        const quota = await (prisma as any).apiQuota.upsert({
            where: { provider_date: { provider, date: today } },
            update: { count: { increment: 1 } },
            create: { provider, date: today, maxLimit: limit, count: 1 }
        });
        return quota.count <= limit;
    } catch (e) {
        console.error(`[SYNC-WEATHER] Erro ao atualizar cota para ${provider}:`, e);
        return true; // Prossegue mesmo com erro na cota para não travar o sync
    }
}

function mapGoogleCondition(type: string, iconBaseUri?: string) {
    const map: Record<string, { text: string; icon: string }> = {
        'CLEAR': { text: 'Céu Limpo', icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png' },
        'SUNNY': { text: 'Ensolarado', icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png' },
        'MOSTLY_CLEAR': { text: 'Predominantemente Limpo', icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png' },
        'MOSTLY_SUNNY': { text: 'Predominantemente Ensolarado', icon: 'https://cdn.weatherapi.com/weather/64x64/day/113.png' },
        'PARTLY_CLOUDY': { text: 'Parcialmente Nublado', icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png' },
        'PARTLY_SUNNY': { text: 'Pequenos Intervalos de Sol', icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png' },
        'MOSTLY_CLOUDY': { text: 'Predominantemente Nublado', icon: 'https://cdn.weatherapi.com/weather/64x64/day/119.png' },
        'CLOUDY': { text: 'Nublado', icon: 'https://cdn.weatherapi.com/weather/64x64/day/122.png' },
        'OVERCAST': { text: 'Encoberto', icon: 'https://cdn.weatherapi.com/weather/64x64/day/122.png' },
        'FOGGY': { text: 'Nevoeiro', icon: 'https://cdn.weatherapi.com/weather/64x64/day/248.png' },
        'RAIN': { text: 'Chuva', icon: 'https://cdn.weatherapi.com/weather/64x64/day/308.png' },
        'LIGHT_RAIN': { text: 'Chuva Leve', icon: 'https://cdn.weatherapi.com/weather/64x64/day/296.png' },
        'PATCHY_RAIN_POSSIBLE': { text: 'Possibilidade de Chuva', icon: 'https://cdn.weatherapi.com/weather/64x64/day/176.png' },
        'THUNDERSTORM': { text: 'Tempestade', icon: 'https://cdn.weatherapi.com/weather/64x64/day/389.png' },
        'SNOW': { text: 'Neve', icon: 'https://cdn.weatherapi.com/weather/64x64/day/338.png' },
    };

    const mapped = map[type.toUpperCase()];
    const resultText = mapped ? mapped.text : type.toLowerCase().replace(/_/g, ' ');
    const resultIcon = iconBaseUri ? `${iconBaseUri}.svg` : (mapped ? mapped.icon : 'https://cdn.weatherapi.com/weather/64x64/day/116.png');

    return { text: resultText, icon: resultIcon };
}

export async function runWeatherSync(silent: boolean = false, runId?: string) {
    if (!GOOGLE_WEATHER_API_KEY) {
        throw new Error("GOOGLE_WEATHER_API_KEY não configurada no .env");
    }

    const actualRunId = runId || crypto.randomUUID();
    const logId = crypto.randomUUID();
    console.log(`[SYNC-WEATHER] >>> INICIANDO SINCRO GOOGLE [RUN: ${actualRunId}] [LOG: ${logId}] <<<`);

    try {
        // 0. Limpeza de logs "travados" usando sintaxe Prisma se possível, ou SQL simples
        try {
            await (prisma as any).syncLog.updateMany({
                where: {
                    status: 'RUNNING',
                    type: 'WEATHER',
                    startTime: { lt: new Date(Date.now() - 15 * 60 * 1000) }
                },
                data: {
                    status: 'FAILED',
                    message: 'Sincronização interrompida: Timeout/Stale'
                }
            });
        } catch (e) {
            console.warn("[SYNC-WEATHER] Falha ao limpar logs antigos:", e);
        }

        const syncDaysStr = await getSystemConfig('WEATHER_SYNC_DAYS', '8');
        const syncDays = parseInt(syncDaysStr) || 8;

        // Criar Log de Início (Standard Prisma)
        await (prisma as any).syncLog.create({
            data: {
                id: logId,
                type: 'WEATHER',
                startTime: new Date(),
                status: 'RUNNING',
                message: `Iniciando sincronização de Clima (Google Weather) para ${syncDays} dias...`,
                runId: actualRunId
            }
        });

        const anchors = await prisma.forecastAnchor.findMany();
        if (anchors.length === 0) throw new Error("Nenhum Ponto de Referência cadastrado.");

        let weatherCalls = 0;

        for (const anchor of anchors) {
            if (await checkAndIncrementQuota('GOOGLE_WEATHER', GOOGLE_WEATHER_MONTHLY_LIMIT)) {
                const dailyUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?location.latitude=${anchor.latitude}&location.longitude=${anchor.longitude}&key=${GOOGLE_WEATHER_API_KEY}&pageSize=10`;
                
                const dailyRes = await fetch(dailyUrl);
                const dailyData = dailyRes.ok ? await dailyRes.json() : null;
                weatherCalls++;

                let allHours: any[] = [];
                let nextToken = '';
                let pages = 0;

                // Loop para buscar até 10 páginas (240h) ou até acabar os dados
                while (pages < 10) {
                    const hourlyUrl = `https://weather.googleapis.com/v1/forecast/hours:lookup?location.latitude=${anchor.latitude}&location.longitude=${anchor.longitude}&key=${GOOGLE_WEATHER_API_KEY}&hours=240${nextToken ? `&pageToken=${nextToken}` : ''}`;
                    const hRes = await fetch(hourlyUrl);
                    if (!hRes.ok) break;
                    
                    const hData = await hRes.json();
                    weatherCalls++;
                    allHours = allHours.concat(hData.forecastHours || []);
                    
                    if (!hData.nextPageToken || allHours.length >= 240) break;
                    nextToken = hData.nextPageToken;
                    pages++;
                }

                if (dailyData && allHours.length > 0) {
                    const hourlyData = { forecastHours: allHours };

                    if (dailyData?.forecastDays) {
                        const todayBrazil = getBrazilToday();
                        
                        for (let i = 0; i < syncDays; i++) {
                            const targetDate = new Date(todayBrazil);
                            targetDate.setUTCDate(todayBrazil.getUTCDate() + i);
                            targetDate.setUTCHours(0, 0, 0, 0);

                            const targetDateStr = targetDate.toISOString().split('T')[0];
                            
                            // Achar o dia correspondente no retorno da Google
                            const day = dailyData.forecastDays.find((fd: any) => 
                                fd.interval.startTime.startsWith(targetDateStr)
                            );

                            if (!day) continue; // Pula se Google não tiver esse dia específico

                            const existing = await prisma.weatherForecast.findUnique({
                                where: { anchorId_date: { anchorId: anchor.id, date: targetDate } }
                            });

                            const hoursForDay = hourlyData.forecastHours?.filter((h: any) => {
                                return h.interval.startTime.startsWith(targetDateStr);
                            }).map((h: any, idx: number) => {
                                const existingHour = (existing?.hourlyData as any[])?.[idx];
                                const cond = mapGoogleCondition(h.weatherCondition.type, h.weatherCondition.iconBaseUri);
                                return {
                                    time: h.interval.startTime.replace('T', ' ').replace('Z', '').substring(0, 16),
                                    temp: h.temperature?.degrees || 0,
                                    condition: cond.text,
                                    icon: cond.icon,
                                    windSpeed: h.wind?.speed?.value || 0,
                                    windDir: degreesToCardinal(h.wind?.direction?.degrees || 0),
                                    waveHeight: existingHour?.waveHeight || 0,
                                    waveDirection: existingHour?.waveDirection || 0,
                                    wavePeriod: existingHour?.wavePeriod || 0
                                };
                            }) || [];

                            const dayCond = mapGoogleCondition(
                                day.daytimeForecast?.weatherCondition?.type || day.weatherCondition?.type || 'CLEAR',
                                day.daytimeForecast?.weatherCondition?.iconBaseUri || day.weatherCondition?.iconBaseUri
                            );

                            await prisma.weatherForecast.upsert({
                                where: { anchorId_date: { anchorId: anchor.id, date: targetDate } },
                                update: {
                                    condition: dayCond.text,
                                    tempMax: day.maxTemperature?.degrees || 0,
                                    tempMin: day.minTemperature?.degrees || 0,
                                    rainChance: day.daytimeForecast?.precipitation?.probability?.percent || 0,
                                    rainAmount: day.daytimeForecast?.precipitation?.qpf?.quantity || 0,
                                    windDir: day.daytimeForecast?.wind?.direction?.cardinal || 'NE',
                                    windSpeed: day.daytimeForecast?.wind?.speed?.value || 0,
                                    hourlyData: hoursForDay,
                                    icon: dayCond.icon
                                },
                                create: {
                                    anchorId: anchor.id,
                                    date: targetDate,
                                    condition: dayCond.text,
                                    tempMax: day.maxTemperature?.degrees || 0,
                                    tempMin: day.minTemperature?.degrees || 0,
                                    rainChance: day.daytimeForecast?.precipitation?.probability?.percent || 0,
                                    rainAmount: day.daytimeForecast?.precipitation?.qpf?.quantity || 0,
                                    windDir: day.daytimeForecast?.wind?.direction?.cardinal || 'NE',
                                    windSpeed: day.daytimeForecast?.wind?.speed?.value || 0,
                                    hourlyData: hoursForDay,
                                    icon: dayCond.icon
                                }
                            });
                        }
                    }
                }
            }
        }

        const finalMessage = `Sucesso: [STEP: weather] concluído via Google. (${weatherCalls} chamadas).`;
        await (prisma as any).syncLog.update({
            where: { id: logId },
            data: {
                endTime: new Date(),
                status: 'SUCCESS',
                message: finalMessage,
                response: { weatherCalls }
            }
        });

        if (!silent) {
            await sendAdminNotification(`🌦️ <b>Sincronização de Clima Concluída (Google)</b>\n\nStatus: Sucesso ✅\nChamadas: ${weatherCalls}`);
        }

        return { success: true, weather: weatherCalls, finished: false, nextStep: 'marine', runId: actualRunId };

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC WEATHER GOOGLE <<<", error);
        if (!silent) {
            try {
                await sendAdminNotification(`❌ <b>ERRO NO SYNC CLIMA (Google)</b>\n\nErro: ${error.message}`);
            } catch (e) {}
        }
        
        try {
            await (prisma as any).syncLog.update({
                where: { id: logId },
                data: {
                    endTime: new Date(),
                    status: 'FAILED',
                    message: error.message
                }
            });
        } catch (e) {
            console.error("Falha ao salvar log de erro:", e);
        }
        
        return { success: false, error: error.message, runId: actualRunId };
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const silent = searchParams.get('silent') === 'true';
        const runId = searchParams.get('runId') || undefined;
        const result = await runWeatherSync(silent, runId);
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } catch (fatalError: any) {
        console.error("!!! ERRO FATAL NA ROTA SYNC-WEATHER !!!", fatalError);
        return NextResponse.json({ 
            success: false, 
            error: `Erro Fatal Interno: ${fatalError.message}` 
        }, { status: 500 });
    }
}
