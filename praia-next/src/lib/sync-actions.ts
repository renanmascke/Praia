'use server';

import prisma from './prisma';

export async function getSyncSteps(logId: string) {
    try {
        const steps = await (prisma as any).syncStepLog.findMany({
            where: { logId },
            orderBy: { createdAt: 'asc' }
        });
        return { success: true, steps };
    } catch (error: any) {
        console.error('Erro ao buscar SyncStepLog:', error);
        return { success: false, error: error.message };
    }
}
