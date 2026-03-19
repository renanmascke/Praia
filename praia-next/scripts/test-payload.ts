import { PrismaClient } from '@prisma/client';
import { getBrazilToday } from '../src/lib/date-utils';
const prisma = new PrismaClient();

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
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

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
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
    const summary = summaries.find(
      (s: any) => toDateKey(s.date) === key && s.cityId === city.id
    );
    const dayRankings = rankings.filter(
      (r: any) => toDateKey(r.date) === key && r.beach?.cityId === city.id
    );
    const dayForecasts = forecasts.filter(
      (f: any) => toDateKey(f.date) === key
    );
    let chosenForecast = dayForecasts[0] || null;

    return {
      date: key,
      hasForecast: !!chosenForecast,
      rankingsCount: dayRankings.length
    };
  });

  console.log('Payload structure:', JSON.stringify(payload, null, 2));
  
  const filteredPayload = payload.filter(p => p.hasForecast);
  console.log('Filtered payload length:', filteredPayload.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
