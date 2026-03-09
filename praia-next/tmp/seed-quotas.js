const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedQuotas() {
    console.log("🌱 Populando dados de quota com fuso horário Brasil...");

    // Simular o comportamento do getBrazilToday()
    const now = new Date();
    const brazilStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // 'YYYY-MM-DD'
    const today = new Date(brazilStr + 'T00:00:00Z');

    const data = [
        // StormGlass Hoje (06/03 no Brasil)
        { provider: 'STORMGLASS', date: today, count: 8, maxLimit: 10 },

        // WeatherAPI Histórico Março
        { provider: 'WEATHERAPI', date: new Date('2026-03-03T00:00:00Z'), count: 35, maxLimit: 10000000 },
        { provider: 'WEATHERAPI', date: new Date('2026-03-04T00:00:00Z'), count: 30, maxLimit: 10000000 },
        { provider: 'WEATHERAPI', date: new Date('2026-03-05T00:00:00Z'), count: 4, maxLimit: 10000000 },
        { provider: 'WEATHERAPI', date: today, count: 5, maxLimit: 10000000 }
    ];

    for (const item of data) {
        await prisma.apiQuota.upsert({
            where: { provider_date: { provider: item.provider, date: item.date } },
            update: { count: item.count },
            create: item
        });
        console.log(`✅ ${item.provider} em ${item.date.toISOString().split('T')[0]}: ${item.count}`);
    }

    console.log("🏁 Dados inseridos com sucesso!");
    process.exit(0);
}

seedQuotas().catch(e => {
    console.error(e);
    process.exit(1);
});
