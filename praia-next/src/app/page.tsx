import prisma from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";
import { getBrazilToday } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

type DayPayload = {
  date: string;
  summary: string | null;
  forecast: any | null;
  rankings: {
    best: any[];
    worst: any[];
  };
};

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export default async function Home() {
  // Cidade principal (Floripa)
  const city = await prisma.city.findFirst({
    where: { name: "Florianópolis" },
  });

  if (!city) {
    throw new Error("Cidade 'Florianópolis' não encontrada no banco.");
  }

  // Próximos 7 dias (incluindo hoje) no fuso de Brasília
  const today = getBrazilToday();

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const dateKeys = days.map(toDateKey);

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
      orderBy: {
        position: "asc",
      },
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
      orderBy: {
        date: "asc",
      },
    }),
  ]);

  const payload: DayPayload[] = days.map((date) => {
    const key = toDateKey(date);

    const summary = summaries.find(
      (s: any) => toDateKey(s.date) === key && s.cityId === city.id,
    );

    const dayRankings = rankings.filter(
      (r: any) => toDateKey(r.date) === key && r.beach?.cityId === city.id,
    );

    const best = dayRankings;
    const worst: any[] = [];

    const dayForecasts = forecasts.filter(
      (f: any) => toDateKey(f.date) === key,
    );

    // Se o resumo tiver bestAnchorId, tentamos usar esse ponto como referência
    let chosenForecast: any | null = null;
    if (summary?.bestAnchorId) {
      chosenForecast =
        dayForecasts.find(
          (f: any) => f.anchorId === summary.bestAnchorId,
        ) || null;
    }

    if (!chosenForecast) {
      // fallback: primeiro forecast do dia
      chosenForecast = dayForecasts[0] || null;
    }

    return {
      date: key,
      summary: summary?.content ?? null,
      forecast: chosenForecast,
      rankings: {
        best,
        worst,
      },
    };
  }).filter((d) => d.forecast); // Apenas dias com dados

  return (
    <main className="min-h-screen bg-[#fcfcfd] text-slate-900 antialiased pb-12 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <header className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase italic leading-none">Boletim de Praia: Floripa 🏖️</h1>
            <p className="mt-2 text-slate-400 font-medium text-[10px] uppercase tracking-[0.2em]">Previsão dos próximos 7 dias</p>
        </header>

        <DashboardClient initialDays={payload} />

        <footer className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-[0.15em] py-4">
            Fontes: Balneabilidade Oficial do IMA (Em Tempo Real) e Condições Meteorológicas via WeatherAPI
        </footer>
      </div>
    </main>
  );
}
