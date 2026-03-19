import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Verificando Dados do Banco ---');
  
  const cityCount = await prisma.city.count();
  const cities = await prisma.city.findMany();
  console.log(`Cidades (${cityCount}):`, cities.map(c => c.name));

  const anchorCount = await prisma.forecastAnchor.count();
  console.log(`Pontos de Referência (Anchors): ${anchorCount}`);

  const forecastCount = await prisma.weatherForecast.count();
  console.log(`Previsões de Clima (WeatherForecast): ${forecastCount}`);

  const rankingCount = await prisma.beachRanking.count();
  console.log(`Rankings de Praia (BeachRanking): ${rankingCount}`);

  const latestSync = await (prisma as any).syncLog.findFirst({
    orderBy: { startTime: 'desc' }
  });
  console.log('Último Sync Log:', latestSync);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('Data "Hoje" calculada no script (Local):', today.toISOString());

  const citiesFound = await prisma.city.findFirst({ where: { name: 'Florianópolis' } });
  console.log('Cidade Florianópolis encontrada?', !!citiesFound);

  const forecastDates = await prisma.weatherForecast.findMany({ select: { date: true }, distinct: ['date'], orderBy: { date: 'asc' } });
  console.log('Datas com WeatherForecast:', forecastDates.map(d => d.date.toISOString()));

  const rankingDates = await prisma.beachRanking.findMany({ select: { date: true }, distinct: ['date'], orderBy: { date: 'asc' } });
  console.log('Datas com BeachRanking:', rankingDates.map(d => d.date.toISOString()));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
