'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateConfigs(configs: { key: string, value: string }[]) {
    try {
        for (const config of configs) {
            await (prisma as any).systemConfig.upsert({
                where: { key: config.key },
                update: { value: config.value },
                create: { key: config.key, value: config.value }
            });
        }
        revalidatePath('/admin/configuracoes');
        return { success: true };
    } catch (error: any) {
        console.error('Erro ao atualizar configurações:', error);
        return { success: false, error: error.message };
    }
}
