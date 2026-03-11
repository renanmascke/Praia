import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';
import { beachWhitelist } from '@/lib/data';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { addSyncStep } from '@/lib/sync-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function runImaSync(silent: boolean = false, runId?: string) {
    const actualRunId = runId || crypto.randomUUID();
    console.log(`>>> SYNC IMA INICIADO [RUN: ${actualRunId}] <<<`);
    const logId = crypto.randomUUID();
    const startTime = new Date();

    // 0. Limpeza de logs "travados" (mais de 15 min em RUNNING)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale'
        WHERE status = 'RUNNING' AND type = 'IMA' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // 0.1. Trava de concorrência
    const activeSync = await prisma.syncLog.findFirst({
        where: { type: 'IMA', status: 'RUNNING', startTime: { gte: new Date(Date.now() - 15 * 60 * 1000) } }
    });

    if (activeSync) {
        console.warn(">>> SYNC IMA ABORTADO: Já existe uma sincronização em andamento.");
        if (!silent) {
            await sendAdminNotification(`⚠️ *Sync IMA Abortado*\n\nMotivo: Já existe outra sincronização em andamento.`);
        }
        return { success: false, error: "Concorrência detectada: Outra sincronização do IMA está em andamento." };
    }

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'IMA', NOW(), 'RUNNING', 'Iniciando raspagem multi-cidade do IMA...', NOW())
    `);

    try {
        const cities = await prisma.city.findMany({
            where: { imaId: { not: null } }
        });

        if (cities.length === 0) {
            throw new Error("Nenhuma cidade com imaId cadastrada para sincronização.");
        }

        let totalBeaches = 0;
        let totalReports = 0;
        const allReports: Record<string, Record<string, any>> = {};

        // 1. Processar cidades em paralelo
        const cityJobs = cities.map(async (city) => {
            console.log(`>>> Sincronizando cidade: ${city.name} (IMA ID: ${city.imaId})`);
            await addSyncStep(logId, `Iniciando raspagem para ${city.name} (ID: ${city.imaId})`);
            const cityReports: Record<string, Record<string, any>> = {};

            // 1.1. Pré-Injetar as Praias do Whitelist (Apenas Floripa)
            if (city.name === 'Florianópolis') {
                await addSyncStep(logId, `Injetando whitelist para Florianópolis...`);
                for (const bw of beachWhitelist) {
                    await prisma.beach.upsert({
                        where: { name: bw.target },
                        update: { region: bw.region, cityId: city.id, idealWind: bw.idealWind, offlineDesc: bw.offlineDesc || "" },
                        create: { name: bw.target, region: bw.region, cityId: city.id, idealWind: bw.idealWind, offlineDesc: bw.offlineDesc || "" }
                    });
                }
            }

            // 1.2. Buscar HTML do Histórico do IMA
            const targetUrl = 'https://balneabilidade.ima.sc.gov.br/relatorio/historico';
            const params = new URLSearchParams();
            params.append('municipioID', city.imaId!.toString());
            params.append('localID', '0');
            params.append('ano', new Date().getFullYear().toString());
            params.append('redirect', 'true');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos

            try {
                const res = await fetch(targetUrl, {
                    method: 'POST',
                    body: params,
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Referer': targetUrl
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) return { cityName: city.name, reports: {} };

                const htmlString = await res.text();
                if (htmlString.includes("Microsoft OLE DB Provider for SQL Server")) return { cityName: city.name, reports: {} };

                const $ = cheerio.load(htmlString);
                const allLabelsAndTables = $('label, table');
                let currentPoint: any = {};

                allLabelsAndTables.each((_, el) => {
                    const $el = $(el);
                    if ($el.is('label')) {
                        const text = $el.text().trim();
                        if (text.includes("Balneário:")) currentPoint.balneario = text.replace("Balneário:", "").trim();
                        if (text.includes("Ponto de Coleta:")) currentPoint.point = text.replace("Ponto de Coleta:", "").trim();
                        if (text.includes("Localização:")) currentPoint.location = text.replace("Localização:", "").trim();
                    } else if ($el.is('table')) {
                        const rows = $el.find('tbody tr');
                        if (rows.length > 0 && currentPoint.point) {
                            const cleanObjName = `${currentPoint.balneario} ${currentPoint.point} ${currentPoint.location}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                            const match = beachWhitelist.find(bw => {
                                const hasKeys = bw.keys.every((k: string) => cleanObjName.includes(k));
                                const noExcludes = bw.not ? !bw.not.some((n: string) => cleanObjName.includes(n)) : true;
                                return hasKeys && noExcludes;
                            });

                            if (match) {
                                const target = match.target;
                                if (!cityReports[target]) cityReports[target] = {};

                                rows.each((_, tr) => {
                                    const tds = $(tr).find('td');
                                    if (tds.length < 9) return;
                                    const dateText = tds.eq(0).text().trim();
                                    const eColi = tds.eq(7).text().trim();
                                    const statusText = tds.eq(8).text().trim().toUpperCase();
                                    if (!dateText || !eColi) return;

                                    if (!cityReports[target][dateText]) {
                                        cityReports[target][dateText] = { pts: 0, pPts: 0, imp: 0, ind: 0, points: [] };
                                    }

                                    const report = cityReports[target][dateText];
                                    report.pts++;
                                    if (statusText.includes("IMPRÓPRIA") || statusText.includes("IMPROPRIA")) report.imp++;
                                    else if (statusText.includes("PRÓPRIA") || statusText.includes("PROPRIA")) report.pPts++;
                                    else report.ind++;

                                    report.points.push({ name: currentPoint.point, location: currentPoint.location, eColi, status: statusText.includes("PRÓPRIA") ? "Próprio" : "Impróprio", date: dateText });
                                });
                            }
                            currentPoint = {};
                        }
                    }
                });
                await addSyncStep(logId, `Finalizado raspagem para ${city.name}: ${Object.keys(cityReports).length} praias encontradas.`);
                return { cityName: city.name, reports: cityReports };
            } catch (e: any) {
                console.error(`Erro ao processar ${city.name}:`, e);
                await addSyncStep(logId, `ERRO em ${city.name}: ${e.message}`);
                return { cityName: city.name, reports: {} };
            }
        });

        const jobResults = await Promise.all(cityJobs);

        // 2. Mesclar resultados
        for (const res of jobResults) {
            for (const beachName of Object.keys(res.reports)) {
                if (!allReports[beachName]) allReports[beachName] = {};
                Object.assign(allReports[beachName], res.reports[beachName]);
            }
        }

        // 4. Persistir dados colhidos
        console.log("Persistindo dados históricos...");
        await addSyncStep(logId, `Iniciando persistência no DB de ${Object.keys(allReports).length} praias.`);
        for (const beachName of Object.keys(allReports)) {
            const beach = await prisma.beach.findUnique({ where: { name: beachName } });
            if (!beach) continue;

            totalBeaches++;
            const reportsByDate = allReports[beachName];

            for (const dateStr of Object.keys(reportsByDate)) {
                const bData = reportsByDate[dateStr];
                let reportDate = new Date();
                reportDate.setHours(0, 0, 0, 0);

                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    reportDate = new Date(`${isoDate}T00:00:00.000Z`);
                }

                const data = {
                    pts: bData.pts,
                    pPts: bData.pPts,
                    improprios: bData.imp,
                    indeterminados: bData.ind,
                    status: (bData.imp > 0 && bData.imp < bData.pts) ? "Mista" : (bData.imp > 0) ? "Imprópria" : "Própria",
                    points: bData.points as any
                };

                await prisma.report.upsert({
                    where: { beachId_date: { beachId: beach.id, date: reportDate } },
                    update: data,
                    create: { ...data, beachId: beach.id, date: reportDate }
                });
                totalReports++;
            }
        }

        // 5. Atualizar LOG DE IMA (Ranking removido para evitar timeout individual)
        await (prisma as any).$executeRawUnsafe(`UPDATE SyncLog SET message = 'IMA: Dados persistidos com sucesso.' WHERE id = '${logId}'`);

        const finalResponse = {
            success: true,
            cities: cities.length,
            beaches: totalBeaches,
            reports: totalReports,
            timestamp: new Date().toISOString()
        };

        // Atualizar Log de Sucesso
        const successMsg = `Sucesso: [STEP: ima] concluído. (${totalBeaches} praias, ${totalReports} laudos em ${cities.length} cidades).`;
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = '${successMsg}', response = '${JSON.stringify(finalResponse).replace(/'/g, "''")}'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🧪 <b>Sincronização IMA Concluída</b>\n\nStatus: Sucesso ✅\nCidades: ${cities.length}\nPraias: ${totalBeaches}\nLaudos: ${totalReports}`);
        }

        return { ...finalResponse, finished: false, nextStep: 'weather', runId: actualRunId };

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC IMA CORE <<<", error);

        if (!silent) {
            await sendAdminNotification(`❌ <b>ERRO NO SYNC IMA</b>\n\nErro: ${error.message}`);
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
    const result = await runImaSync(silent, runId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
