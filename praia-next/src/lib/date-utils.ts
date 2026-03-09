/**
 * Utilitários para tratamento de data e fuso horário (Brasil)
 */

export function getBrazilToday(): Date {
    // Retorna o dia atual no fuso horário de Brasília (America/Sao_Paulo)
    // Formatado como Date as 00:00:00 UTC para compatibilidade com @db.Date do Prisma
    const now = new Date();
    const brazilStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // 'YYYY-MM-DD'
    return new Date(brazilStr + 'T00:00:00Z');
}

export function formatToBrazilDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function getStartOfMonthBrazil(): Date {
    const today = getBrazilToday();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}
