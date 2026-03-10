import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings, triggerGlobalRankingUpdate } from '@/lib/ranking';

import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function runRankingSync(silent: boolean = false) {
    console.log(">>> RECALCULO DE RANKING CORE INICIADO <<<");
    const logId = crypto.randomUUID();

    // 0. Limpeza de logs "travados" (mais de 15 min em RUNNING)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale (mais de 15 min sem resposta)'
        WHERE status = 'RUNNING' AND type = 'RANKING' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // 0.1. Trava de concorrência
    const activeSync = await prisma.syncLog.findFirst({
        where: { type: 'RANKING', status: 'RUNNING', startTime: { gte: new Date(Date.now() - 15 * 60 * 1000) } }
    });

    if (activeSync) {
        console.warn(">>> RANKING ABORTADO: Já existe uma sincronização em andamento.");
        return { success: false, error: "Concorrência detectada: Outra sincronização de Ranking está em andamento." };
    }

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'RANKING', NOW(), 'RUNNING', 'Recalculando scores e posições de todas as cidades...', NOW())
    `);

    try {
        await triggerGlobalRankingUpdate(logId);

        // Atualizar Log de Sucesso
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = 'Sucesso: Rankings de todas as cidades recalculados.'
            WHERE id = '${logId}'
        `);

        if (!silent) {
            await sendAdminNotification(`🏆 *Ranking Recalculado*\n\nStatus: Sucesso ✅`);
        }

        return { success: true, message: 'Ranking recalculado com sucesso!' };
    } catch (error: any) {
        console.error('Erro no recalculo core do ranking:', error);

        if (!silent) {
            await sendAdminNotification(`❌ *ERRO NO RECALCULO DE RANKING*\n\nErro: ${error.message}`);
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
    const result = await runRankingSync(silent);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
