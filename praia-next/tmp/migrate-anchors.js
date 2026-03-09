const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    try {
        console.log('Cleaning up old forecasts...');
        await prisma.$executeRawUnsafe('DELETE FROM WeatherForecast');

        console.log('Creating initial anchors for Florianópolis...');
        const central = await prisma.forecastAnchor.create({
            data: {
                name: 'Florianópolis (Centro/Geral)',
                city: 'Florianópolis',
                latitude: -27.5954,
                longitude: -48.5480
            }
        });

        console.log(`Anchor created: ${central.id}`);

        const norte = await prisma.forecastAnchor.create({
            data: {
                name: 'Norte da Ilha (Jurerê)',
                city: 'Florianópolis',
                latitude: -27.4419,
                longitude: -48.4908
            }
        });

        const leste = await prisma.forecastAnchor.create({
            data: {
                name: 'Leste da Ilha (Joaquina)',
                city: 'Florianópolis',
                latitude: -27.6289,
                longitude: -48.4485
            }
        });

        const sul = await prisma.forecastAnchor.create({
            data: {
                name: 'Sul da Ilha (Campeche)',
                city: 'Florianópolis',
                latitude: -27.6833,
                longitude: -48.4947
            }
        });

        console.log('Linking existing beaches to Central anchor...');
        await prisma.beach.updateMany({
            data: {
                anchorId: central.id,
                city: 'Florianópolis'
            }
        });

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
