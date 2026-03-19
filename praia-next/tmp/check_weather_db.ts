import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkWeatherHourly() {
    const today = new Date();
    const brazilTodayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const brazilToday = new Date(brazilTodayStr + 'T00:00:00Z');

    console.log('Checking forecasts starting from:', brazilToday.toISOString());

    const forecasts = await prisma.weatherForecast.findMany({
        where: {
            date: { gte: brazilToday }
        },
        orderBy: { date: 'asc' },
        take: 10
    });

    console.log(`Found ${forecasts.length} forecasts.`);

    forecasts.forEach(f => {
        const hourly = (f.hourlyData as any[]) || [];
        console.log(`Date: ${f.date.toISOString().split('T')[0]} | Hourly items: ${hourly.length}`);
        if (hourly.length > 0) {
            console.log(`   Sample hour: ${hourly[0].time} | Temp: ${hourly[0].temp} | Wind: ${hourly[0].windSpeed}`);
        }
    });
}

checkWeatherHourly().catch(console.error).finally(() => prisma.$disconnect());
