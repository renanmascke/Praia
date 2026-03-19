import prisma from './prisma';

export async function getSystemConfig(key: string, defaultValue: string): Promise<string> {
    try {
        const config = await (prisma as any).systemConfig.findUnique({
            where: { key }
        });
        return config ? config.value : defaultValue;
    } catch (error) {
        console.error(`Erro ao buscar configuração ${key}:`, error);
        return defaultValue;
    }
}

export async function setSystemConfig(key: string, value: string, description?: string) {
    return await (prisma as any).systemConfig.upsert({
        where: { key },
        update: { value, ...(description ? { description } : {}) },
        create: { key, value, description }
    });
}

/**
 * Inicializa as configurações padrão se não existirem
 */
export async function initDefaultConfigs() {
    const defaults = [
        { key: 'WEATHER_SYNC_DAYS', value: '8', description: 'Dias de previsão do tempo (incluindo hoje)' },
        { key: 'RANKING_SYNC_DAYS', value: '4', description: 'Dias de geração de ranking/dica IA (incluindo hoje)' }
    ];

    for (const config of defaults) {
        const existing = await (prisma as any).systemConfig.findUnique({ where: { key: config.key } });
        if (!existing) {
            await setSystemConfig(config.key, config.value, config.description);
            console.log(`Configuração ${config.key} inicializada com valor ${config.value}`);
        }
    }
}
