'use client';

import { useState } from 'react';
import SearchFilter from '../components/SearchFilter';
import Pagination from '../components/Pagination';

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

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr className="border-b border-slate-200">
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Data (Coleta Oficial)</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[45%]">Praia Relacionada</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Resultado Geral</th>
                                <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Pontos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 text-sm italic font-medium">
                                        Nenhum laudo encontrado para os critérios de busca.
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-2.5 px-4">
                                            <div className="font-bold text-slate-800 text-xs">
                                                {new Date(report.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </div>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                                                {report.beach.name}
                                            </span>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${report.status === 'Própria' ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]' :
                                                    report.status === 'Imprópria' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                                                        'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                                    }`}></span>
                                                <span className="font-bold text-slate-700 text-[10px] uppercase tracking-widest">{report.status}</span>
                                            </div>
                                        </td>
                                        <td className="p-2.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs font-black text-slate-600">
                                                    {report.pPts} <span className="text-slate-300 font-medium text-[9px]">de</span> {report.pts}
                                                </div>
                                                {report.points && Array.isArray(report.points) && (report.points as any[]).length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100/50"
                                                    >
                                                        <span className="text-[9px] font-black uppercase tracking-tight">Ver Detalhes</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0">
                    <Pagination currentPage={currentPage} totalPages={totalPages} totalResults={totalResults} />
                </div>
            </div>

            {/* Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                        <header className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl mb-1">{selectedReport.beach.name}</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Coleta em {new Date(selectedReport.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="bg-slate-200/50 hover:bg-slate-200 text-slate-500 rounded-full p-2 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </header>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-center">
                                    <div className="text-2xl font-black text-teal-600 mb-1">{selectedReport.pPts}</div>
                                    <div className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Próprios</div>
                                </div>
                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                                    <div className="text-2xl font-black text-rose-600 mb-1">{selectedReport.improprios}</div>
                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Impróprios</div>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {(selectedReport.points as any[]).map((p, idx) => {
                                    const eColiVal = parseInt(p.eColi?.replace('>', '') || '0');
                                    const isHighContamination = eColiVal > 800;

                                    return (
                                        <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                            <div className="p-4 flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">{p.name}</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${p.status === 'Próprio' ? 'bg-teal-100 text-teal-600' :
                                                            p.status === 'Impróprio' ? 'bg-rose-100 text-rose-600' :
                                                                'bg-amber-100 text-amber-600'
                                                            }`}>
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700 leading-tight">{p.location}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-black leading-none ${isHighContamination ? 'text-rose-600' : 'text-slate-600'}`}>
                                                        {p.eColi}
                                                    </div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">E. Coli (NMP/100ml)</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <footer className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-slate-500/20 shadow-slate-800/10"
                            >
                                Fechar
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
}
