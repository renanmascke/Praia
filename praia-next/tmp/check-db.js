const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const beachCount = await prisma.beach.count();
        const forecastCount = await prisma.weatherForecast.count();
        console.log(`Beaches: ${beachCount}`);
        console.log(`Forecasts: ${forecastCount}`);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
