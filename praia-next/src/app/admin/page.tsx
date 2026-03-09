import prisma from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function AdminDashboard() {
    const totalBeaches = await prisma.beach.count();
    const totalReports = await prisma.report.count();
    const weatherDays = await prisma.weatherForecast.count();

    // Buscar as últimas sincronizações com sucesso ou falha
    const lastImaaSync = await prisma.syncLog.findFirst({
        where: { type: 'IMA' },
        orderBy: { startTime: 'desc' }
    });

    const lastWeatherSync = await prisma.syncLog.findFirst({
        where: { type: 'WEATHER' },
        orderBy: { startTime: 'desc' }
    });

    // Buscar laudos recentes para o mini feed
    // Priorizamos exibir praias IMPRÓPRIAS no topo, seguidas por MISTAS e depois PRÓPRIAS, mantendo a data recente
    const allRecentReports = await prisma.report.findMany({
        orderBy: { date: 'desc' },
        take: 15,
        include: { beach: true }
    });

    // Ordenação manual para priorizar Imprópria
    const sortedReports = [...allRecentReports].sort((a, b) => {
        if (a.status === 'Imprópria' && b.status !== 'Imprópria') return -1;
        if (a.status !== 'Imprópria' && b.status === 'Imprópria') return 1;
        if (a.status === 'Mista' && b.status === 'Própria') return -1;
        if (a.status === 'Própria' && b.status === 'Mista') return 1;
        return 0;
    }).slice(0, 5);

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-10 flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-3">
                    <span className="text-sky-500">📊</span> Painel de Controle
                </h1>
                <p className="text-slate-500 font-medium text-sm">Resumo do sistema e integrações em tempo real.</p>
            </header>

            {/* KPI Panel */}
            {/* KPI Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

                {/* Card 1: Praias */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-sky-200 transition-all group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0">
                                🏖️
                            </div>
                            <div>
                                <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Praias Monitoradas</h3>
                                <div className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{totalBeaches}</div>
                            </div>
                        </div>
                        <Link href="/admin/praias" className="text-[9px] font-black text-sky-500 hover:text-sky-600 uppercase tracking-widest border border-sky-100 px-3 py-1.5 rounded-xl bg-sky-50/30">
                            Gerenciar
                        </Link>
                    </div>
                </div>

                {/* Card 2: IMA */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0">
                                🧪
                            </div>
                            <div>
                                <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Histórico IMA (Laudos)</h3>
                                <div className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{totalReports}</div>
                            </div>
                        </div>
                        <Link href="/admin/ima" className="text-[9px] font-black text-emerald-500 hover:text-emerald-600 uppercase tracking-widest border border-emerald-100 px-3 py-1.5 rounded-xl bg-emerald-50/30">
                            Ver Feed
                        </Link>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50">
                        {lastImaaSync ? (
                            <div className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 ${lastImaaSync.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                Última Sincronização: {format(new Date(lastImaaSync.endTime || lastImaaSync.startTime), "dd/MM 'às' HH:mm")}
                                {lastImaaSync.status === 'FAILED' && <span className="underline ml-1">(Erro)</span>}
                            </div>
                        ) : (
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Sem dados de sincronização</div>
                        )}
                    </div>
                </div>

                {/* Card 3: Weather */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0">
                                🌤️
                            </div>
                            <div>
                                <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Previsão do Tempo</h3>
                                <div className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{weatherDays} <span className="text-sm text-slate-400 font-bold">dias</span></div>
                            </div>
                        </div>
                        <Link href="/admin/previsao" className="text-[9px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest border border-blue-100 px-3 py-1.5 rounded-xl bg-blue-50/30">
                            Calendário
                        </Link>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50">
                        {lastWeatherSync ? (
                            <div className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 ${lastWeatherSync.status === 'SUCCESS' ? 'text-blue-500' : 'text-rose-500'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                Última Sincronização: {format(new Date(lastWeatherSync.endTime || lastWeatherSync.startTime), "dd/MM 'às' HH:mm")}
                                {lastWeatherSync.status === 'FAILED' && <span className="underline ml-1">(Erro)</span>}
                            </div>
                        ) : (
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Sem dados de sincronização</div>
                        )}
                    </div>
                </div>

            </div>

            {/* Content Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <span className="text-sky-500">🧪</span> Últimos Laudos Registrados
                    </h2>
                    <Link href="/admin/ima" className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm font-bold uppercase text-slate-500 hover:text-slate-800 transition-colors">
                        Ver Todos
                    </Link>
                </div>

                <div className="p-0">
                    {sortedReports.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Nenhum laudo encontrado no banco. Execute o CRON do IMA.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sortedReports.map(report => (
                                <li key={report.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <Link
                                            href={`/admin/ima?search=${encodeURIComponent(report.beach.name)}`}
                                            className="font-bold text-slate-800 text-sm uppercase tracking-tight hover:text-sky-600 hover:underline transition-all"
                                        >
                                            {report.beach.name}
                                        </Link>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                                            Data: {format(new Date(report.date), "dd/MM/yyyy HH:mm")}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${report.status === 'Própria' ? 'bg-emerald-100 text-emerald-700' : report.status === 'Imprópria' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {report.status}
                                        </span>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                                            {report.pPts} / {report.pts}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
