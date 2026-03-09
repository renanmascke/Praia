import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings, triggerGlobalRankingUpdate } from '@/lib/ranking';

import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';

export async function runRankingSync(silent: boolean = false) {
    console.log(">>> RECALCULO DE RANKING CORE INICIADO <<<");
    const logId = crypto.randomUUID();

    // Criar Log de Início
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'RANKING', NOW(), 'RUNNING', 'Recalculando scores e posições de todas as cidades...', NOW())
    `);

    try {
        await triggerGlobalRankingUpdate();

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
