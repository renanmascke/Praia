import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';
import { beachWhitelist } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> SYNC IMA INICIADO (MULTI-CIDADE) <<<");
    const logId = crypto.randomUUID();
    const startTime = new Date();

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

            // 1. Pré-Injetar as Praias do Whitelist (Atualmente mapeado para Floripa)
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

            // ... fetching ...

            // Inside the parsing loop, only use the whitelist if it's the right city or implement a generic way
            // For now, let's allow the find to happen but it only matches if keys match IMA labels
            // which are specific to these beaches.

            // 2. Buscar HTML do Histórico do IMA para a cidade
            const targetUrl = 'https://balneabilidade.ima.sc.gov.br/relatorio/historico';
            const params = new URLSearchParams();
            params.append('municipioID', city.imaId!.toString());
            params.append('localID', '0');
            params.append('ano', new Date().getFullYear().toString());
            params.append('redirect', 'true');

            const res = await fetch(targetUrl, {
                method: 'POST',
                body: params,
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': targetUrl
                }
            });

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

        return NextResponse.json(finalResponse);

    } catch (error: any) {
        console.error(">>> ERRO NO SYNC IMA <<<", error);
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
