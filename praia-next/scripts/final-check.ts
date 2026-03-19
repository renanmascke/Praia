import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function getBrazilToday() {
    const now = new Date();
    // Simulating getBrazilToday without external dependency
    const brazilStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // 'YYYY-MM-DD'
    return new Date(brazilStr + 'T00:00:00Z');
}

async function main() {
  const city = await prisma.city.findFirst({
    where: { name: "Florianópolis" },
  });

  if (!city) {
    console.error("Cidade 'Florianópolis' não encontrada.");
    return;
  }

  const today = getBrazilToday();
  console.log('Today (Brazil GMT-0):', today.toISOString());

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    days.push(d);
  }
  const dateKeys = days.map(toDateKey);
  console.log('Days to query:', dateKeys);

  const [summaries, rankings, forecasts] = await Promise.all([
    (prisma as any).cityDailySummary.findMany({
      where: {
        cityId: city.id,
        date: { in: days },
      },
    }),
    (prisma as any).beachRanking.findMany({
      where: {
        date: { in: days },
        beach: {
          cityId: city.id,
        },
      },
      include: {
        beach: true
      }
    }),
    (prisma as any).weatherForecast.findMany({
      where: {
        date: { in: days },
        anchor: {
          cityId: city.id,
        },
      },
      include: {
        anchor: true,
      },
    }),
  ]);

  console.log('Summaries found:', summaries.length);
  console.log('Rankings found:', rankings.length);
  console.log('Forecasts found:', forecasts.length);

  const payload = days.map((date) => {
    const key = toDateKey(date);
    const hasForecast = forecasts.some((f: any) => toDateKey(f.date) === key);
    return { date: key, hasForecast };
  });

  console.log('Payload structure:', JSON.stringify(payload, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
