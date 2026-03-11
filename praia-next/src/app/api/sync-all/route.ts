import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { getGlobalSteps, getNextPendingStep } from '@/lib/ranking';
import { runImaSync } from '../sync-ima/route';
import { runWeatherSync } from '../sync-weather/route';
import { runMarineSync } from '../sync-marine/route';
import { runRankingSync } from '../sync-ranking/route';
import { initDefaultConfigs } from '@/lib/system-config';

export async function GET(request: Request) {
    // Garantir que configurações básicas existam
    await initDefaultConfigs();

    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // 0. Autenticação básica Cron
    if (process.env.CRON_SECRET && !isCron) {
        const { hostname } = new URL(request.url);
        if (hostname !== 'localhost') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
    }

    // 1. Definir RunId estável para Cron ou dinâmico para Manual
    let runId = searchParams.get('runId');
    if (!runId && isCron) {
        // No Cron, usamos a data como ID para que pings a cada 10min continuem o mesmo trabalho
        const today = new Date().toISOString().split('T')[0];
        runId = `cron-daily-${today}`;
    }
    const actualRunId = runId || crypto.randomUUID();

    // 2. Limpeza de logs "travados" (Global)
    await (prisma as any).$executeRawUnsafe(`
        UPDATE SyncLog 
        SET status = 'FAILED', message = 'Sincronização interrompida: Timeout/Stale'
        WHERE status = 'RUNNING' AND startTime < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);

    try {
        // 3. Detectar qual o próximo passo na "Esteira Global"
        const globalSteps = await getGlobalSteps();
        const nextStep = await getNextPendingStep(actualRunId, globalSteps);
        
        if (!nextStep) {
            return NextResponse.json({ 
                success: true, 
                finished: true, 
                message: 'Sincronização Completa: Tudo já foi atualizado para este RunId.',
                runId: actualRunId
            });
        }

        console.log(`>>> SYNC ALL [RUN: ${actualRunId}] -> EXECUTANDO PASSO: ${nextStep} <<<`);

        // 4. Executar o passo detectado
        let result: any;
        if (nextStep === 'ima') {
            result = await runImaSync(true, actualRunId);
        } else if (nextStep === 'weather') {
            result = await runWeatherSync(true, actualRunId);
        } else if (nextStep === 'marine') {
            result = await runMarineSync(true, actualRunId);
        } else {
            // Passos de Ranking (math, ai-block-0..3, summary)
            result = await runRankingSync(true, nextStep, actualRunId);
        }

        // 5. Retornar status para o orquestrador (Browser ou Cron)
        return NextResponse.json({
            ...result,
            finished: false, // O despachante 'all' só termina quando nextStep for null
            nextStep: globalSteps[globalSteps.indexOf(nextStep) + 1] || null,
            runId: actualRunId
        });

    } catch (error: any) {
        console.error(">>> ERRO NO DISPATCHER GLOBAL <<<", error);
        return NextResponse.json({ success: false, error: error.message, runId: actualRunId }, { status: 500 });
    }
}
