import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cities = await prisma.city.findMany();
  console.log('--- Cidades ---');
  cities.forEach(c => console.log(`ID: ${c.id}, Name: ${c.name}`));

  const anchors = await prisma.forecastAnchor.findMany({ include: { city: true } });
  console.log('\n--- Pontos de Referência (Anchors) ---');
  anchors.forEach(a => console.log(`ID: ${a.id}, Name: ${a.name}, CityID: ${a.cityId}, CityName: ${a.city?.name}`));

  const forecasts = await prisma.weatherForecast.findMany({ 
    take: 5,
    include: { anchor: true }
  });
  console.log('\n--- Algumas Previsões ---');
  forecasts.forEach(f => console.log(`Date: ${f.date.toISOString()}, Anchor: ${f.anchor?.name}, AnchorCityID: ${f.anchor?.cityId}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
