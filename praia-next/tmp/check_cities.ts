import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const cities = await (prisma as any).city.findMany();
    console.log('Cities:', JSON.stringify(cities, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
