'use client';

import { useState } from 'react';
import Pagination from '../components/Pagination';
import { 
    Calendar, 
    Waves, 
    Activity, 
    FileText, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    HelpCircle,
    ChevronRight,
    MapPin,
    ArrowUpRight
} from 'lucide-react';

interface Point {
    name: string;
    location: string;
    eColi: string;
    status: string;
    date: string;
}

interface Report {
    id: string;
    date: Date | string;
    beach: { name: string };
    status: string;
    pts: number;
    pPts: number;
    improprios: number;
    points: any;
}

interface IMATableProps {
    reports: Report[];
    currentPage: number;
    totalPages: number;
    totalResults: number;
}

export default function IMATable({ reports, currentPage, totalPages, totalResults }: IMATableProps) {
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const getStatusIcon = (status: string) => {
        if (status === 'Própria') return <CheckCircle2 size={16} className="text-emerald-500" />;
        if (status === 'Imprópria') return <AlertCircle size={16} className="text-rose-500" />;
        return <HelpCircle size={16} className="text-amber-500" />;
    };

    const getStatusStyles = (status: string) => {
        if (status === 'Própria') return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/5';
        if (status === 'Imprópria') return 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-500/5';
        return 'bg-amber-50 text-amber-600 border-amber-100';
    };

    return (
        <>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl flex flex-col min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md">
                            <tr className="border-b border-slate-100">
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Data (Coleta IMA)</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Ponto Relacionado</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status Geral</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center">Abrangência</th>
                                <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <FileText size={48} className="text-slate-200" />
                                            <p className="text-slate-800 font-bold uppercase tracking-widest text-xs">Nenhum laudo registrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-blue-50/20 transition-all group cursor-default">
                                        <td className="p-5 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-white group-hover:text-blue-500 transition-all">
                                                    <Calendar size={14} />
                                                </div>
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {new Date(report.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 px-8">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                                                    {report.beach.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5 px-8">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${getStatusStyles(report.status)}`}>
                                                {getStatusIcon(report.status)}
                                                {report.status}
                                            </div>
                                        </td>
                                        <td className="p-5 px-8">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-8 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-500 h-full" style={{ width: `${(report.pPts / report.pts) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-800">{report.pPts}/{report.pts}</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Pontos Próprios</span>
                                            </div>
                                        </td>
                                        <td className="p-5 px-8 text-right">
                                            {report.points && Array.isArray(report.points) && (report.points as any[]).length > 0 ? (
                                                <button
                                                    onClick={() => setSelectedReport(report)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-95"
                                                >
                                                    Detalhes
                                                    <ArrowUpRight size={14} />
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase italic">Sem Dados</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalResults > 0 && (
                    <div className="p-6 bg-slate-50/30 border-t border-slate-100 shrink-0">
                        <Pagination currentPage={currentPage} totalPages={totalPages} totalResults={totalResults} />
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedReport(null)}
                    />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 relative z-10 flex flex-col max-h-[90vh]">
                        
                        <header className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-xl tracking-tight leading-tight">{selectedReport.beach.name}</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                        <Calendar size={12} /> Coleta em {new Date(selectedReport.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-transparent hover:border-slate-200"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </header>

                        <div className="p-8 pb-4 shrink-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-5 text-center transition-all hover:bg-emerald-50">
                                    <span className="block text-3xl font-black text-emerald-600 leading-none mb-1">{selectedReport.pPts}</span>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Resultados Próprios</span>
                                </div>
                                <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-5 text-center transition-all hover:bg-rose-50">
                                    <span className="block text-3xl font-black text-rose-600 leading-none mb-1">{selectedReport.improprios}</span>
                                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Resultados Impróprios</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 custom-scrollbar">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Waves size={14} className="text-blue-500" /> Detalhamento de Pontos de Coleta
                            </h4>
                            {(selectedReport.points as any[]).map((p, idx) => {
                                const eColiVal = parseInt(p.eColi?.replace('>', '') || '0');
                                const isCritical = eColiVal > 800;

                                return (
                                    <div key={idx} className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden group hover:bg-white hover:border-blue-200 transition-all p-5">
                                        <div className="flex justify-between items-start gap-6">
                                            <div className="flex-1 space-y-1.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{p.name || `Ponto ${idx + 1}`}</span>
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                                        p.status === 'Próprio' ? 'bg-emerald-100 text-emerald-700' :
                                                        p.status === 'Impróprio' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {p.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin size={14} className="text-slate-300 mt-0.5 shrink-0" />
                                                    <p className="text-sm font-bold text-slate-800 leading-snug">{p.location}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={`text-2xl font-black leading-none tracking-tighter ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                                                    {p.eColi}
                                                </div>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-tight">E. Coli<br/>(NMP/100ml)</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <footer className="p-8 border-t border-slate-100 bg-white flex justify-center shrink-0">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-[0.2em] text-[10px] py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95"
                            >
                                Fechar Detalhamento
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
}
