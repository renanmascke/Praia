import prisma from '@/lib/prisma';
import DashboardClient from '@/components/DashboardClient';

export const revalidate = 3600; // Cache de 1 hora na Vercel CDN

export default async function Home() {
  const beaches = await prisma.beach.findMany({
    include: {
      reports: {
        orderBy: { date: 'desc' },
        take: 1
      }
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const forecasts = await prisma.weatherForecast.findMany({
    where: {
      date: { gte: today }
    },
    orderBy: { date: 'asc' },
    take: 7
  });

  const mappedBeaches = beaches.map(b => ({
    id: b.id,
    name: b.name,
    region: b.region,
    idealWind: b.idealWind,
    offlineDesc: b.offlineDesc,
    pts: b.reports[0]?.pts || 0,
    pPts: b.reports[0]?.pPts || 0,
    imp: b.reports[0]?.improprios || 0,
    status: b.reports[0]?.status || 'Sem Laudo'
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <header className="text-center mb-8 gap-2 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight uppercase italic leading-none">
          inDica Praia 🏖️
        </h1>
        <p className="mt-2 text-slate-400 font-medium text-[10px] sm:text-xs uppercase tracking-[0.2em]">
          Previsão dos próximos 7 dias
        </p>
      </header>

      {/* Client Component que contém toda a interatividade e Gráficos */}
      <DashboardClient initialBeaches={mappedBeaches} initialForecasts={forecasts as any[]} />

      <footer className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-[0.15em] py-8 mt-4">
        Fontes: Balneabilidade Oficial do IMA (Em Tempo Real) e Condições Meteorológicas (WeatherAPI) via Next.js SSR
      </footer>
    </main>
  );
}
