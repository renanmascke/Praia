import prisma from '@/lib/prisma';
import RankingClient from './RankingClient';

export default async function AdminRankingPage() {
    // Buscar cidades e regiões únicas para os filtros
    const [cities, regions] = await Promise.all([
        prisma.city.findMany({ orderBy: { name: 'asc' } }),
        prisma.beach.findMany({
            select: { region: true },
            distinct: ['region'],
            orderBy: { region: 'asc' }
        })
    ]);

    const regionList = regions.map(r => r.region).filter(Boolean);

    return (
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
            <header className="mb-8 shrink-0">
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center gap-3">
                    <span className="text-orange-500">🏆</span> Ranking de Indicações
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                    Acompanhe o desempenho e a pontuação das praias baseada em microclimas e balneabilidade.
                </p>
            </header>

            <RankingClient initialCities={cities} initialRegions={regionList} />
        </div>
    );
}
