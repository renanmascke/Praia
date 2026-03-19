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

    // 0. Limpeza de logs "travados"
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    await prisma.syncLog.updateMany({
        where: { status: 'RUNNING', type: 'RANKING', startTime: { lt: fifteenMinAgo } },
        data: { status: 'FAILED', message: 'Sincronização interrompida: Timeout/Stale', endTime: new Date() }
    });

    // Criar Log de Início com runId e marcação de passo
    const stepMsg = `Iniciando [STEP: ${actualStep}]...`;
    const log = await prisma.syncLog.create({
        data: {
            runId: actualRunId,
            type: 'RANKING',
            startTime: new Date(),
            status: 'RUNNING',
            message: stepMsg
        },
        select: { id: true }
    });
    const logId = log.id;

    try {
        await triggerGlobalRankingUpdate(logId, actualStep);

        // Atualizar Log de Sucesso com marcação clara para o scanner
        const successMsg = `Sucesso: [STEP: ${actualStep}] concluído.`;
        await prisma.syncLog.update({
            where: { id: logId },
            data: { endTime: new Date(), status: 'SUCCESS', message: successMsg }
        });

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
        await prisma.syncLog.update({
            where: { id: logId },
            data: { endTime: new Date(), status: 'FAILED', message: String(error?.message || error) }
        });
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
