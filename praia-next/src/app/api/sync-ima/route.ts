import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';
import { beachWhitelist } from '@/lib/data';
import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function runImaSync(silent: boolean = false) {
    console.log(">>> SYNC IMA INICIADO (CORE) <<<");
    const logId = crypto.randomUUID();
    const startTime = new Date();

    // 0. Limpeza de logs "travados" (mais de 15 min em RUNNING)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale (mais de 15 min sem resposta)'
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

        for (const city of cities) {
            console.log(`>>> Sincronizando cidade: ${city.name} (IMA ID: ${city.imaId})`);

            // 1. Pré-Injetar as Praias do Whitelist
            if (city.name === 'Florianópolis') {
                for (const bw of beachWhitelist) {
                    await prisma.beach.upsert({
                        where: { name: bw.target },
                        update: {
                            region: bw.region,
                            cityId: city.id,
                            idealWind: bw.idealWind,
                            offlineDesc: bw.offlineDesc || ""
                        },
                        create: {
                            name: bw.target,
                            region: bw.region,
                            cityId: city.id,
                            idealWind: bw.idealWind,
                            offlineDesc: bw.offlineDesc || ""
                        }
                    });
                }
            }

            // 2. Buscar HTML do Histórico do IMA para a cidade
            const targetUrl = 'https://balneabilidade.ima.sc.gov.br/relatorio/historico';
            const params = new URLSearchParams();
            params.append('municipioID', city.imaId!.toString());
            params.append('localID', '0');
            params.append('ano', new Date().getFullYear().toString());
            params.append('redirect', 'true');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos

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

            if (!res.ok) {
                console.error(`Falha ao buscar IMA para ${city.name}: ${res.status}`);
                continue;
            }

            const htmlString = await res.text();
            if (htmlString.includes("Microsoft OLE DB Provider for SQL Server")) {
                console.error(`ERRO SQL NO SERVIDOR DO IMA PARA ${city.name}`);
                continue;
            }

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
                            if (!allReports[target]) allReports[target] = {};

                            rows.each((_, tr) => {
                                const tds = $(tr).find('td');
                                if (tds.length < 9) return;

                                const dateText = tds.eq(0).text().trim();
                                const eColi = tds.eq(7).text().trim();
                                const statusText = tds.eq(8).text().trim().toUpperCase();

                                if (!dateText || !eColi) return;

                                if (!allReports[target][dateText]) {
                                    allReports[target][dateText] = { pts: 0, pPts: 0, imp: 0, ind: 0, points: [] };
                                }

                                const report = allReports[target][dateText];
                                report.pts++;

                                let status = "Indeterminado";
                                if (statusText.includes("IMPRÓPRIA") || statusText.includes("IMPROPRIA")) {
                                    report.imp++;
                                    status = "Impróprio";
                                } else if (statusText.includes("PRÓPRIA") || statusText.includes("PROPRIA")) {
                                    report.pPts++;
                                    status = "Próprio";
                                } else {
                                    report.ind++;
                                }

                                report.points.push({
                                    name: currentPoint.point,
                                    location: currentPoint.location,
                                    eColi: eColi,
                                    status: status,
                                    date: dateText
                                });
                            });
                        }
                        currentPoint = {};
                    }
                }
            });
        }

        // 4. Persistir dados colhidos
        console.log("Persistindo dados históricos...");
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

        // 5. Atualizar Rankings
        await (prisma as any).$executeRawUnsafe(`UPDATE SyncLog SET message = 'IMA: Iniciando recalculado de Rankings (3 dias)...' WHERE id = '${logId}'`);
        await (await import('@/lib/ranking')).triggerGlobalRankingUpdate(logId);

        const finalResponse = {
            success: true,
            cities: cities.length,
            beaches: totalBeaches,
            reports: totalReports,
            timestamp: new Date().toISOString()
        };

        // Atualizar Log de Sucesso
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = 'Sucesso: ${totalBeaches} praias, ${totalReports} laudos em ${cities.length} cidades.', response = '${JSON.stringify(finalResponse).replace(/'/g, "''")}'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🧪 *Sincronização IMA Concluída*\n\nStatus: Sucesso ✅\nCidades: ${cities.length}\nPraias: ${totalBeaches}\nLaudos: ${totalReports}`);
        }

        return finalResponse;

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC IMA CORE <<<", error);

        if (!silent) {
            await sendAdminNotification(`❌ *ERRO NO SYNC IMA*\n\nErro: ${error.message}`);
        }

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);
        return { success: false, error: error.message };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const silent = searchParams.get('silent') === 'true';
    const result = await runImaSync(silent);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
