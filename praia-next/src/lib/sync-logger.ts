import prisma from './prisma';

/**
 * Grava um log detalhado para uma etapa específica de uma sincronização.
 * @param logId ID do log principal na tabela SyncLog
 * @param message Mensagem detalhada da etapa
 */
export async function addSyncStep(logId: string, message: string) {
    try {
        console.log(`[SYNC-LOG:${logId}] ${message}`);
        await (prisma as any).syncStepLog.create({
            data: {
                logId,
                message
            }
        });
    } catch (error) {
        console.error('Erro ao gravar SyncStepLog:', error);
    }
}
