import prisma from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
    Umbrella, 
    TestTube, 
    Sun, 
    TrendingUp, 
    TrendingDown, 
    ArrowRight,
    Calendar,
    Circle
} from 'lucide-react';

export default async function AdminDashboard() {
    const totalBeaches = await prisma.beach.count();
    const totalReports = await prisma.report.count();
    const weatherDays = await prisma.weatherForecast.count();

    const lastImaaSync = await prisma.syncLog.findFirst({
        where: { type: 'IMA' },
        orderBy: { startTime: 'desc' }
    });

    const lastWeatherSync = await prisma.syncLog.findFirst({
        where: { type: 'WEATHER' },
        orderBy: { startTime: 'desc' }
    });

    const allRecentReports = await prisma.report.findMany({
        orderBy: { date: 'desc' },
        take: 15,
        include: { beach: true }
    });

    const sortedReports = [...allRecentReports].sort((a, b) => {
        if (a.status === 'Imprópria' && b.status !== 'Imprópria') return -1;
        if (a.status !== 'Imprópria' && b.status === 'Imprópria') return 1;
        if (a.status === 'Mista' && b.status === 'Própria') return -1;
        if (a.status === 'Própria' && b.status === 'Mista') return 1;
        return 0;
    }).slice(0, 5);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Olá, Administrador 👋</h1>
                <p className="text-slate-500 mt-1 font-medium">Aqui está o que está acontecendo no seu sistema hoje.</p>
            </div>

            {/* KPI Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                {/* Card 1: Praias */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-tight">Praias Monitoradas</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalBeaches}</h3>
                            <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                                <TrendingUp size={14} />
                                <span>+12% este mês</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                            <Umbrella size={24} />
                        </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-50/50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </div>

                {/* Card 2: IMA */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-tight">Laudos Registrados</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalReports}</h3>
                            <div className="mt-4">
                                {lastImaaSync ? (
                                    <div className={`flex items-center gap-2 font-bold text-[10px] uppercase tracking-tighter px-2 py-1 rounded-lg w-fit ${lastImaaSync.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <Circle size={8} fill="currentColor" className={lastImaaSync.status === 'SUCCESS' ? 'animate-pulse' : ''} />
                                        Sinc: {format(new Date(lastImaaSync.endTime || lastImaaSync.startTime), "dd/MM HH:mm")}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Sem sincronização</div>
                                )}
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                            <TestTube size={24} />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-50/50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </div>

                {/* Card 3: Weather */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-tight">Previsão Ativa</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-2">{weatherDays} <span className="text-sm text-slate-400 font-medium">dias</span></h3>
                            <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded-lg w-fit">
                                <Calendar size={14} />
                                <span>Dados atualizados</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                            <Sun size={24} />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-50/50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </div>

            </div>

            {/* Content Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                         <h2 className="text-lg font-bold text-slate-900">Últimos Laudos Registrados</h2>
                         <p className="text-xs text-slate-500 font-medium mt-1">Monitoramento de balneabilidade das praias.</p>
                    </div>
                    <Link href="/admin/ima" className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                        Ver Todos <ArrowRight size={14} />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    {sortedReports.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                             <TestTube size={48} className="mx-auto text-slate-200 mb-4" />
                             <p className="text-sm font-medium">Nenhum laudo encontrado no banco.</p>
                             <button className="mt-4 text-xs font-bold text-blue-600 underline">Executar Sincronização agora</button>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Praia</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Data do Laudo</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Pontuação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedReports.map(report => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/ima?search=${encodeURIComponent(report.beach.name)}`}
                                                className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-all flex items-center gap-2"
                                            >
                                                {report.beach.name}
                                                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-600 font-medium">
                                                {format(new Date(report.date), "dd/MM/yyyy")}
                                                <span className="text-slate-400 ml-2">{format(new Date(report.date), "HH:mm")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full inline-flex items-center gap-1.5 ${
                                                report.status === 'Própria' 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : report.status === 'Imprópria' 
                                                ? 'bg-rose-100 text-rose-700' 
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    report.status === 'Própria' ? 'bg-emerald-500' : report.status === 'Imprópria' ? 'bg-rose-500' : 'bg-amber-500'
                                                }`} />
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-700">
                                                {report.pPts} <span className="text-slate-400 font-medium whitespace-nowrap">/ {report.pts} pts</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
