import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings, triggerGlobalRankingUpdate } from '@/lib/ranking';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log(">>> RECALCULO DE RANKING MANUAL INICIADO <<<");
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

        return NextResponse.json({ success: true, message: 'Ranking recalculado com sucesso!' });
    } catch (error: any) {
        console.error('Erro no recalculo manual do ranking:', error);

        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
