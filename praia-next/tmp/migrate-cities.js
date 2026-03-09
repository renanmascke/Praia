const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    try {
        console.log('Creating Florianópolis record...');
        const floripa = await prisma.city.upsert({
            where: { name: 'Florianópolis' },
            update: { imaId: 2 },
            create: { name: 'Florianópolis', imaId: 2 }
        });

        console.log('Linking ForecastAnchors to City...');
        await prisma.forecastAnchor.updateMany({
            data: { cityId: floripa.id }
        });

        console.log('Linking Beaches to City...');
        await prisma.beach.updateMany({
            data: { cityId: floripa.id }
        });

        console.log('City migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
