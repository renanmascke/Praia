require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuota() {
    console.log("🚀 Iniciando teste de controle de quota...");

    const provider = 'STORMGLASS';
    const limit = 10;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Resetar quota para teste
    await prisma.apiQuota.upsert({
        where: { provider_date: { provider, date: today } },
        update: { count: 8 }, // Simular que já usou 8 de 10
        create: { provider, date: today, count: 8, maxLimit: limit }
    });
    console.log("✔ Simulação: Quota iniciada em 8/10");

    // 2. Tentar incrementar duas vezes (deve chegar em 10)
    for (let i = 1; i <= 3; i++) {
        const q = await prisma.apiQuota.findUnique({
            where: { provider_date: { provider, date: today } }
        });

        if (q.count < q.maxLimit) {
            await prisma.apiQuota.update({
                where: { id: q.id },
                data: { count: { increment: 1 } }
            });
            console.log(`🔼 Incremented: ${q.count + 1}/${limit}`);
        } else {
            console.log(`🛑 Limite atingido: ${q.count}/${limit}. Bloqueando próxima chamada.`);
        }
    }

    console.log("🏁 Teste concluído com sucesso!");
    process.exit(0);
}

testQuota().catch(e => {
    console.error(e);
    process.exit(1);
});
