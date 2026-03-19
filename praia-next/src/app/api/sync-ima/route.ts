import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';
import { beachWhitelist } from '@/lib/data';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { addSyncStep } from '@/lib/sync-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ============================================================
// FUNÇÕES AUXILIARES (mesmo padrão do scrape_ima.js)
// ============================================================

/** Extrai o valor após o ":" de uma label */
function extrairValorLabel(texto: string): string {
    const partes = texto.split(':');
    return partes.length > 1 ? partes.slice(1).join(':').trim() : texto.trim();
}

/** Normaliza texto para comparação com o whitelist (remove acentos, uppercase) */
function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

/**
 * Parseia o HTML retornado pelo IMA usando a mesma lógica do scrape_ima.js:
 * - Detecta tabelas de cabeçalho (com style text-align:center e labels)
 * - Detecta tabelas de dados (class table-print) e extrai os registros
 * - Faz match com o beachWhitelist para cada bloco
 */
function parseHtml(html: string) {
    const $ = cheerio.load(html);
    const allReports: Record<string, Record<string, any>> = {};
    let totalBlocos = 0;

    const tabelas = $('table');
    let blocoAtual: { municipio: string; balneario: string; ponto: string; localizacao: string } | null = null;

    tabelas.each((_, tabela) => {
        const $tabela = $(tabela);
        const classes = $tabela.attr('class') || '';
        const style = $tabela.attr('style') || '';

        // Detectar tabela de cabeçalho (mesmo padrão do scrape_ima.js)
        if (classes.includes('table') && style.includes('text-align: center')) {
            const labels = $tabela.find('label');
            if (labels.length >= 4) {
                blocoAtual = {
                    municipio: extrairValorLabel($(labels[0]).text()),
                    balneario: extrairValorLabel($(labels[1]).text()),
                    ponto: extrairValorLabel($(labels[2]).text()),
                    localizacao: extrairValorLabel($(labels[3]).text()),
                };
                totalBlocos++;
            }
            return;
        }

        // Detectar tabela de dados
        if (classes.includes('table-print') && blocoAtual) {
            // Match com whitelist usando a mesma lógica existente
            const cleanObjName = normalize(`${blocoAtual.balneario} ${blocoAtual.ponto} ${blocoAtual.localizacao}`);
            const match = beachWhitelist.find(bw => {
                const hasKeys = bw.keys.every((k: string) => cleanObjName.includes(k));
                const noExcludes = bw.not ? !bw.not.some((n: string) => cleanObjName.includes(n)) : true;
                return hasKeys && noExcludes;
            });

            if (match) {
                const target = match.target;
                if (!allReports[target]) allReports[target] = {};

                const linhas = $tabela.find('tbody tr');
                linhas.each((_, tr) => {
                    const celulas = $(tr).find('td');
                    if (celulas.length < 9) return;

                    const dateText = $(celulas[0]).text().trim();
                    const eColi = $(celulas[7]).text().trim();
                    const statusText = $(celulas[8]).text().trim().toUpperCase();
                    if (!dateText || !eColi) return;

                    if (!allReports[target][dateText]) {
                        allReports[target][dateText] = { pts: 0, pPts: 0, imp: 0, ind: 0, points: [] };
                    }

                    const report = allReports[target][dateText];
                    report.pts++;
                    if (statusText.includes('IMPRÓPRIA') || statusText.includes('IMPROPRIA')) report.imp++;
                    else if (statusText.includes('PRÓPRIA') || statusText.includes('PROPRIA')) report.pPts++;
                    else report.ind++;

                    report.points.push({
                        name: blocoAtual!.ponto,
                        location: blocoAtual!.localizacao,
                        eColi,
                        status: statusText.includes('PRÓPRIA') ? 'Próprio' : 'Impróprio',
                        date: dateText
                    });
                });
            }
            // Resetar bloco atual após processar tabela de dados
            blocoAtual = null;
        }
    });

    return { allReports, totalBlocos };
}

/**
 * Persiste os reports no banco via batch INSERT com ON DUPLICATE KEY UPDATE.
 * Muito mais rápido que upserts individuais do Prisma.
 */
async function batchUpsertReports(
    allReports: Record<string, Record<string, any>>,
    beachMap: Map<string, string> // nome → id
): Promise<{ totalBeaches: number; totalReports: number }> {
    let totalBeaches = 0;
    let totalReports = 0;
    const BATCH_SIZE = 200;

    // Acumular todos os valores para batch insert
    const rows: {
        id: string; beachId: string; date: string;
        pts: number; pPts: number; improprios: number; indeterminados: number;
        points: string; status: string;
    }[] = [];

    for (const beachName of Object.keys(allReports)) {
        const beachId = beachMap.get(beachName);
        if (!beachId) continue;

        totalBeaches++;
        const reportsByDate = allReports[beachName];

        for (const dateStr of Object.keys(reportsByDate)) {
            const bData = reportsByDate[dateStr];
            const parts = dateStr.split('/');
            let isoDate = new Date().toISOString().split('T')[0];
            if (parts.length === 3) {
                isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }

            const status = (bData.imp > 0 && bData.imp < bData.pts)
                ? 'Mista'
                : (bData.imp > 0) ? 'Imprópria' : 'Própria';

            rows.push({
                id: crypto.randomUUID(),
                beachId,
                date: isoDate,
                pts: bData.pts,
                pPts: bData.pPts,
                improprios: bData.imp,
                indeterminados: bData.ind,
                points: JSON.stringify(bData.points),
                status,
            });
            totalReports++;
        }
    }

    // Executar em lotes
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const lote = rows.slice(i, i + BATCH_SIZE);

        const valuesPlaceholder = lote.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');
        const sql = `
            INSERT INTO Report (id, beachId, date, pts, pPts, improprios, indeterminados, points, status, createdAt, updatedAt)
            VALUES ${valuesPlaceholder}
            ON DUPLICATE KEY UPDATE
                pts = VALUES(pts),
                pPts = VALUES(pPts),
                improprios = VALUES(improprios),
                indeterminados = VALUES(indeterminados),
                points = VALUES(points),
                status = VALUES(status),
                updatedAt = NOW()
        `;

        const valores: (string | number)[] = [];
        for (const r of lote) {
            valores.push(r.id, r.beachId, r.date, r.pts, r.pPts, r.improprios, r.indeterminados, r.points, r.status);
        }

        await (prisma as any).$executeRawUnsafe(sql, ...valores);
    }

    return { totalBeaches, totalReports };
}

// ============================================================
// EXECUÇÃO PRINCIPAL
// ============================================================

export async function runImaSync(silent: boolean = false, runId?: string) {
    const actualRunId = runId || crypto.randomUUID();
    console.log(`>>> SYNC IMA INICIADO [RUN: ${actualRunId}] <<<`);
    const logId = crypto.randomUUID();
    const startTime = Date.now();

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
        VALUES ('${logId}', 'IMA', NOW(), 'RUNNING', 'Iniciando raspagem otimizada do IMA (requisição única)...', NOW())
    `);

    try {
        // 1. Buscar cidades para contar e injetar whitelist
        const cities = await prisma.city.findMany({
            where: { imaId: { not: null } }
        });

        if (cities.length === 0) {
            throw new Error("Nenhuma cidade com imaId cadastrada para sincronização.");
        }

        // 1.1. Pré-Injetar praias do whitelist (Florianópolis)
        const floripaCity = cities.find(c => c.name === 'Florianópolis');
        if (floripaCity) {
            await addSyncStep(logId, 'Injetando whitelist de praias para Florianópolis...');
            for (const bw of beachWhitelist) {
                await prisma.beach.upsert({
                    where: { name: bw.target },
                    update: { region: bw.region, cityId: floripaCity.id, idealWind: bw.idealWind, offlineDesc: bw.offlineDesc || "" },
                    create: { name: bw.target, region: bw.region, cityId: floripaCity.id, idealWind: bw.idealWind, offlineDesc: bw.offlineDesc || "" }
                });
            }
        }

        // 2. REQUISIÇÃO ÚNICA ao IMA com municipioID=0 (todas as cidades)
        await addSyncStep(logId, 'Fazendo POST único ao IMA (municipioID=0, todas as cidades)...');
        const targetUrl = 'https://balneabilidade.ima.sc.gov.br/relatorio/historico';
        const params = new URLSearchParams({
            municipioID: '0',
            localID: '0',
            ano: new Date().getFullYear().toString(),
            redirect: 'true',
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

        const res = await fetch(targetUrl, {
            method: 'POST',
            body: params,
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (compatible; inDicaPraia/1.0)',
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`Falha no POST ao IMA: HTTP ${res.status}`);
        }

        const htmlString = await res.text();
        const sizeMb = (Buffer.byteLength(htmlString, 'utf8') / 1024 / 1024).toFixed(2);
        await addSyncStep(logId, `HTML recebido: ${sizeMb} MB. Parseando...`);

        if (htmlString.includes("Microsoft OLE DB Provider for SQL Server")) {
            throw new Error("IMA retornou erro de banco de dados (OLE DB).");
        }

        // 3. PARSING otimizado (estilo scrape_ima.js)
        const { allReports, totalBlocos } = parseHtml(htmlString);
        const totalPraias = Object.keys(allReports).length;
        await addSyncStep(logId, `Parsing concluído: ${totalBlocos} blocos → ${totalPraias} praias do whitelist encontradas.`);

        // 4. Montar mapa de praias (nome → id)
        const beaches = await prisma.beach.findMany({ select: { id: true, name: true } });
        const beachMap = new Map(beaches.map(b => [b.name, b.id]));

        // 5. BATCH UPSERT dos reports
        await addSyncStep(logId, `Persistindo laudos em batch (${totalPraias} praias)...`);
        const { totalBeaches, totalReports } = await batchUpsertReports(allReports, beachMap);

        // 6. Resultado final
        const duracaoSeg = ((Date.now() - startTime) / 1000).toFixed(1);
        await (prisma as any).$executeRawUnsafe(`UPDATE SyncLog SET message = 'IMA: Dados persistidos com sucesso.' WHERE id = '${logId}'`);

        const finalResponse = {
            success: true,
            cities: cities.length,
            beaches: totalBeaches,
            reports: totalReports,
            duration: `${duracaoSeg}s`,
            timestamp: new Date().toISOString()
        };

        const successMsg = `Sucesso: [STEP: ima] concluído. (${totalBeaches} praias, ${totalReports} laudos em ${duracaoSeg}s).`;
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = '${successMsg}', response = '${JSON.stringify(finalResponse).replace(/'/g, "''")}'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🧪 <b>Sincronização IMA Concluída</b>\n\nStatus: Sucesso ✅\nCidades: ${cities.length}\nPraias: ${totalBeaches}\nLaudos: ${totalReports}\nTempo: ${duracaoSeg}s`);
        }

        console.log(`>>> SYNC IMA CONCLUÍDO em ${duracaoSeg}s (${totalBeaches} praias, ${totalReports} laudos) <<<`);
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
