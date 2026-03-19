import prisma from '@/lib/prisma';
import SyncGrid from '@/components/admin/SyncGrid';
import WeatherCalendar from './WeatherCalendar';

export default async function AdminPrevisaoPage({ searchParams }: { searchParams: { anchorId?: string } }) {
    const selectedAnchorId = searchParams?.anchorId;

    // Buscar todos os pontos de previsão (Anchors) para o filtro
    const [anchors, windDirections] = await Promise.all([
        (prisma as any).forecastAnchor.findMany({
            include: { city: true },
            orderBy: { name: 'asc' }
        }),
        prisma.$queryRaw<any[]>`SELECT * FROM WindDirection`
    ]);

    // Se não houver anchor selecionada, tenta a primeira
    const currentAnchorId = selectedAnchorId || anchors[0]?.id;
    const currentAnchor = anchors.find((a: any) => a.id === currentAnchorId);

    // Buscar previsões apenas para a âncora selecionada
    const forecasts = currentAnchorId ? await (prisma as any).weatherForecast.findMany({
        where: { anchorId: currentAnchorId },
        orderBy: { date: 'asc' },
        take: 31 // Pelo menos um mês de dados
    }) : [];

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-6 flex flex-col md:flex-row justify-between items-center flex-wrap gap-8 shrink-0">
                <div className="flex-1 min-w-[300px]">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-3">
                        <span className="text-blue-500">🌤️</span> Calendário de Previsão
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Visualize e gerencie as condições meteorológicas integradas em formato de calendário.</p>
                </div>
            </header>

            {forecasts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="text-5xl mb-4 opacity-50">🌤️</div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Nenhuma Previsão no Banco</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">Verifique o Sync Job para popular o sistema com dados do Open-Meteo.</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <WeatherCalendar
                        initialForecasts={forecasts}
                        windDirections={windDirections}
                        anchors={anchors}
                        currentAnchorId={currentAnchorId}
                    />
                </div>
            )}
        </div>
    );
}
