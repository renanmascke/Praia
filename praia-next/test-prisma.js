const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log("Instanciando Prisma...");
    const prisma = new PrismaClient();
    console.log("Prisma instanciado com sucesso. Testando conexão...");
    const praias = await prisma.beach.findMany();
    console.log("Conexão OK. Total de praias pre-cadastradas:", praias.length);
}

main()
    .catch(e => {
        console.error("Erro Prisma Teste:", e);
        process.exit(1);
    })
    .finally(async () => {
        // await prisma.$disconnect();
        process.exit(0);
    });
