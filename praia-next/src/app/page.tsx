import prisma from '@/lib/prisma';
import DashboardClient from '@/components/DashboardClient';

export const revalidate = 3600; // Cache de 1 hora na Vercel CDN

export default async function Home() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 0. Buscar configuração de horizonte de dias
  const config = await (prisma as any).systemConfig.findUnique({ where: { key: 'ranking_sync_days' } });
  const horizonDays = config ? parseInt(config.value) : 7;
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (horizonDays - 1));
  maxDate.setHours(23, 59, 59, 999);

  // 1. Buscar datas únicas que possuem ranking processado dentro do horizonte
  const rankedDates = await (prisma as any).beachRanking.findMany({
    where: { 
      date: { 
        gte: today,
        lte: maxDate
      } 
    },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' }
  });

  const validDates: Date[] = rankedDates.map((r: any) => r.date);

  // 2. Buscar todos os forecasts possíveis para essas datas
  const allForecasts = await prisma.weatherForecast.findMany({
    where: {
      date: { in: validDates }
    },
    orderBy: { date: 'asc' }
  });

  // 3. Buscar os rankings e resumos reais para essas datas
  const [beachesData, rankings, summaries] = await Promise.all([
    prisma.beach.findMany({
      include: {
        reports: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    }),
    (prisma as any).beachRanking.findMany({
      where: { date: { in: validDates } },
      include: { beach: true },
      orderBy: { position: 'asc' }
    }),
    (prisma as any).cityDailySummary.findMany({
      where: { date: { in: validDates } }
    })
  ]);

  // 4. Organizar rankings e resumos por data para facilitar no client
  const dailyData = validDates.map((date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    const summary = summaries.find((s: any) => s.date.toISOString().split('T')[0] === dStr);
    return {
      date: dStr,
      summary: summary?.content || null,
      isBest: (summary as any)?.isBest || false,
      bestAnchorId: (summary as any)?.bestAnchorId || null,
      rankings: rankings.filter((r: any) => r.date.toISOString().split('T')[0] === dStr)
    };
  });

  // 5. Selecionar Inteligente do Forecast (Melhor Região Persistida no Sync)
  const selectedForecasts = dailyData.map(d => {
    // Tentar achar o forecast da melhor região gravada no banco para este dia
    let bestForecast = allForecasts.find((f: any) => 
      f.date.toISOString().split('T')[0] === d.date && 
      f.anchorId === d.bestAnchorId
    );

    // Fallback: se não houver bestAnchorId ou não acharmos, pega o primeiro disponível do dia
    if (!bestForecast) {
      bestForecast = allForecasts.find((f: any) => f.date.toISOString().split('T')[0] === d.date);
    }

    return bestForecast;
  }).filter(Boolean);

  const bestDayDate = dailyData.find(d => d.isBest)?.date || null;

  const mappedBeaches = beachesData.map((b: any) => ({
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight uppercase italic leading-none flex items-center gap-3">
          inDica Praia 🏖️
        </h1>
        <p className="mt-2 text-slate-400 font-medium text-[10px] sm:text-xs uppercase tracking-[0.2em]">
          Previsão e Inteligência para os próximos dias
        </p>
      </header>

      {/* Client Component que contém toda a interatividade e Gráficos */}
      <DashboardClient 
        initialBeaches={mappedBeaches} 
        initialForecasts={selectedForecasts as any[]} 
        dailyData={dailyData}
        bestDayDate={bestDayDate}
      />

      <footer className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-[0.15em] py-8 mt-4">
        Fontes: Balneabilidade Oficial do IMA (Em Tempo Real) e Condições Meteorológicas (WeatherAPI) via Next.js SSR
      </footer>
    </main>
  );
}
