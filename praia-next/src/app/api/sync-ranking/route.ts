import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBrazilToday } from '@/lib/date-utils';
import { generateDailyRankings, triggerGlobalRankingUpdate } from '@/lib/ranking';

import { sendAdminNotification } from '@/lib/telegram-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function runRankingSync(silent: boolean = false, step?: string) {
    console.log(`>>> RECALCULO DE RANKING CORE INICIADO (PASSO: ${step || 'completo'}) <<<`);
    const logId = crypto.randomUUID();

    // 0. Limpeza de logs "travados" (mais de 15 min em RUNNING)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale (mais de 15 min sem resposta)'
        WHERE status = 'RUNNING' AND type = 'RANKING' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // 0.1. Trava de concorrência - Permitir passos subsequentes se for o mesmo processo
    // Para simplificar no Step Chaining, não vamos travar se houver um passo específico,
    // pois o frontend vai disparar vários em sequência.
    if (!step) {
        const activeSync = await prisma.syncLog.findFirst({
            where: { type: 'RANKING', status: 'RUNNING', startTime: { gte: new Date(Date.now() - 15 * 60 * 1000) } }
        });

        if (activeSync) {
            console.warn(">>> RANKING ABORTADO: Já existe uma sincronização em andamento.");
            if (!silent) {
                await sendAdminNotification(`⚠️ *Ranking Abortado*\n\nMotivo: Já existe outra sincronização de ranking em andamento.`);
            }
            return { success: false, error: "Concorrência detectada: Outra sincronização de Ranking está em andamento." };
        }
    }

    // Criar Log de Início
    const stepMsg = step ? `Passo ${step} em execução...` : 'Recalculando scores e posições de todas as cidades...';
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, type, startTime, status, message, createdAt)
        VALUES ('${logId}', 'RANKING', NOW(), 'RUNNING', '${stepMsg}', NOW())
    `);

    try {
        await triggerGlobalRankingUpdate(logId, step);

        // Atualizar Log de Sucesso
        const successMsg = step ? `Sucesso: Passo ${step} concluído.` : 'Sucesso: Rankings de todas as cidades recalculados.';
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = '${successMsg}'
            WHERE id = '${logId}'
        `);

        // Notificar apenas no passo final (summary) ou se for full
        if (!silent && (!step || step === 'summary')) {
            await sendAdminNotification(`🏆 *Ranking Recalculado*\n\nStatus: Sucesso ✅`);
        }

        return { success: true, message: step ? `Passo ${step} concluído!` : 'Ranking recalculado com sucesso!' };
    } catch (error: any) {
        console.error(`Erro no recalculo core do ranking (Passo: ${step}):`, error);

        if (!silent) {
            await sendAdminNotification(`❌ *ERRO NO RECALCULO DE RANKING (${step || 'FULL'})*\n\nErro: ${error.message}`);
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
    const step = searchParams.get('step') || undefined;
    const result = await runRankingSync(silent, step);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
