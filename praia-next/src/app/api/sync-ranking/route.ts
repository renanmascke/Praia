import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendAdminNotification } from '@/lib/telegram-admin';
import { getRankingSteps, getNextPendingStep, triggerGlobalRankingUpdate } from '@/lib/ranking';

export async function runRankingSync(silent: boolean = false, step?: string, runId?: string) {
    const actualRunId = runId || crypto.randomUUID();
    
    // Autodetectar passo se não for fornecido explicitamente
    const rankingSteps = await getRankingSteps();
    let actualStep = step;
    if (!actualStep) {
        actualStep = (await getNextPendingStep(actualRunId, rankingSteps)) || undefined;
        if (!actualStep) {
            return { success: true, finished: true, message: 'Ranking já está completo para este RunId.' };
        }
    }

    console.log(`>>> RECALCULO DE RANKING INICIADO [RUN: ${actualRunId}] [STEP: ${actualStep}] <<<`);
    const logId = crypto.randomUUID();

    // 0. Limpeza de logs "travados"
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale'
        WHERE status = 'RUNNING' AND type = 'RANKING' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    // Criar Log de Início com runId e marcação de passo
    const stepMsg = `Iniciando [STEP: ${actualStep}]...`;
    await (prisma as any).$executeRawUnsafe(`
        INSERT INTO SyncLog (id, runId, type, startTime, status, message, createdAt)
        VALUES ('${logId}', '${actualRunId}', 'RANKING', NOW(), 'RUNNING', '${stepMsg}', NOW())
    `);

    try {
        await triggerGlobalRankingUpdate(logId, actualStep);

        // Atualizar Log de Sucesso com marcação clara para o scanner
        const successMsg = `Sucesso: [STEP: ${actualStep}] concluído.`;
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog 
            SET endTime = NOW(), status = 'SUCCESS', message = '${successMsg}'
            WHERE id = '${logId}'
        `);

        // Notificar apenas no passo final
        const isLastStep = rankingSteps.indexOf(actualStep) === rankingSteps.length - 1;
        if (!silent && isLastStep) {
            await sendAdminNotification(`🏆 *Ranking Atualizado*\n\nStatus: 100% Concluído ✅`);
        }

        return { 
            success: true, 
            finished: isLastStep, 
            nextStep: rankingSteps[rankingSteps.indexOf(actualStep) + 1] || null,
            stepLabels: { current: actualStep },
            runId: actualRunId 
        };
    } catch (error: any) {
        console.error(`Erro no ranking [STEP: ${actualStep}]:`, error);
        await (prisma as any).$executeRawUnsafe(`
            UPDATE SyncLog SET endTime = NOW(), status = 'FAILED', message = '${error.message.replace(/'/g, "''")}' WHERE id = '${logId}'
        `);
        return { success: false, error: error.message, runId: actualRunId };
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const silent = searchParams.get('silent') === 'true';
    const step = searchParams.get('step') || undefined;
    const runId = searchParams.get('runId') || undefined;
    const result = await runRankingSync(silent, step, runId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
