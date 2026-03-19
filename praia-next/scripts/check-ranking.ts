import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function getBrazilToday() {
    const now = new Date();
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
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    days.push(d);
  }

  const rankings = await (prisma as any).beachRanking.findMany({
    where: {
      date: { in: days },
      beach: {
        cityId: city.id,
      },
    },
    include: {
      beach: {
        select: {
          name: true,
          region: true,
          cityId: true,
          offlineDesc: true,
          idealWind: true,
        },
      },
    },
  });

  console.log('Total rankings found in DB:', rankings.length);

  const day1Key = toDateKey(days[0]);
  const dayRankings = rankings.filter(
    (r: any) => toDateKey(r.date) === day1Key && r.beach?.cityId === city.id
  );

  console.log(`Rankings for first day (${day1Key}):`, dayRankings.length);
  if (dayRankings.length > 0) {
      console.log('First ranking beach cityId:', dayRankings[0].beach?.cityId);
      console.log('Target cityId:', city.id);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
