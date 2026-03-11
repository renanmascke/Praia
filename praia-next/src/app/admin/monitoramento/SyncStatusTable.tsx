'use client';

import { useState } from 'react';
import { getSyncSteps } from '@/lib/sync-actions';

export default function SyncStatusTable({ logs }: { logs: any[] }) {
    const [selectedResponse, setSelectedResponse] = useState<any>(null);
    const [selectedSteps, setSelectedSteps] = useState<any[] | null>(null);
    const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
    const [logForSteps, setLogForSteps] = useState<any>(null);

    const formatDuration = (start: Date, end: Date | null) => {
        if (!end) return 'Em andamento...';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return `${(diff / 1000).toFixed(1)}s`;
    };

    const handleViewSteps = async (log: any) => {
        setLogForSteps(log);
        setLoadingSteps(log.id);
        const result = await getSyncSteps(log.id);
        if (result.success) {
            setSelectedSteps(result.steps);
        } else {
            alert('Erro ao carregar detalhes: ' + result.error);
        }
        setLoadingSteps(null);
    };

    return (
        <div className="overflow-x-auto relative h-full">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr className="border-b border-slate-200">
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 w-[15%]">Tipo</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Início</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-[15%]">Duração</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-[15%]">Status</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[35%]">Mensagem / Relatório</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-2.5 px-4 font-bold">
                                {(() => {
                                    const config: Record<string, { icon: string, class: string }> = {
                                        IMA: { icon: '🧪', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                        WEATHER: { icon: '🌤️', class: 'bg-sky-50 text-sky-600 border-sky-100' },
                                        MARINE: { icon: '🌊', class: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                                        RANKING: { icon: '🏆', class: 'bg-orange-50 text-orange-600 border-orange-100' },
                                        ALL: { icon: '⚡', class: 'bg-slate-800 text-white border-slate-700' }
                                    };
                                    const c = config[log.type] || { icon: '⚙️', class: 'bg-slate-50 text-slate-600 border-slate-100' };
                                    return (
                                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-2 w-fit border ${c.class}`}>
                                            <span className="text-xs">{c.icon}</span> {log.type}
                                        </span>
                                    );
                                })()}
                            </td>
                            <td className="p-2.5 px-4">
                                <div className="text-[10px] font-bold text-slate-700">
                                    {new Date(log.startTime).toLocaleString('pt-BR')}
                                </div>
                            </td>
                            <td className="p-2.5 px-4 text-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                {formatDuration(log.startTime, log.endTime)}
                            </td>
                            <td className="p-2.5 px-4 text-center">
                                <span className={`px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full border ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                    log.status === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                        log.status === 'RUNNING' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' :
                                            'bg-rose-50 text-rose-600 border-rose-200'
                                    }`}>
                                    {log.status === 'SUCCESS' ? 'Sucesso' :
                                        log.status === 'PARTIAL' ? 'Parcial' :
                                            log.status === 'RUNNING' ? 'Executando' : 'Falhou'}
                                </span>
                            </td>
                            <td className="p-2.5 px-4">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-[10px] font-medium text-slate-500 truncate max-w-[250px]" title={log.message}>
                                        {log.message || '--'}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {log.stepCount > 0 && (
                                            <button
                                                onClick={() => handleViewSteps(log)}
                                                disabled={loadingSteps === log.id}
                                                className="text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-700 transition-colors shrink-0 flex items-center gap-1"
                                            >
                                                <span>📋</span> {loadingSteps === log.id ? 'Carregando...' : `Detalhes (${log.stepCount})`}
                                            </button>
                                        )}
                                        {log.response && (
                                            <button
                                                onClick={() => setSelectedResponse(log)}
                                                className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors shrink-0"
                                            >
                                                Ver JSON
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {logs.length === 0 && (
                        <tr><td colSpan={5} className="p-10 text-center text-slate-500 text-sm italic">Nenhum registro de sincronização encontrado.</td></tr>
                    )}
                </tbody>
            </table>

            {/* Modal de Detalhes JSON */}
            {selectedResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <header className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">
                                Relatório JSON de Sincronização
                            </h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        const response = selectedResponse.response;
                                        let parsed = response;
                                        try {
                                            if (typeof response === 'string') {
                                                parsed = JSON.parse(response);
                                                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                                            }
                                            navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
                                            const btn = document.getElementById('copy-btn');
                                            if (btn) {
                                                const originalText = btn.innerText;
                                                btn.innerText = 'Copiado!';
                                                btn.classList.add('text-emerald-500');
                                                setTimeout(() => {
                                                    btn.innerText = originalText;
                                                    btn.classList.remove('text-emerald-500');
                                                }, 2000);
                                            }
                                        } catch (e) { }
                                    }}
                                    id="copy-btn"
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-all flex items-center gap-1"
                                >
                                    <span>📋</span> Copiar JSON
                                </button>
                                <button onClick={() => setSelectedResponse(null)} className="text-slate-400 hover:text-rose-500 transition-colors text-xl leading-none">✕</button>
                            </div>
                        </header>
                        <div className="p-6 bg-[#0f172a] overflow-auto flex-1 custom-scrollbar">
                            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                {(() => {
                                    const response = selectedResponse.response;
                                    let parsed = response;
                                    if (typeof response === 'string') {
                                        try {
                                            parsed = JSON.parse(response);
                                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                                        } catch (e) {
                                            return <span className="text-rose-400">{response}</span>;
                                        }
                                    }

                                    const jsonString = JSON.stringify(parsed, null, 2);

                                    // Simple syntax highlighting using regex and React nodes
                                    return jsonString.split('\n').map((line, i) => {
                                        const parts = line.split(/(".*?"\s*:|".*?"|true|false|null|\d+)/g);
                                        return (
                                            <div key={i} className="min-h-[1.2rem]">
                                                {parts.map((part, j) => {
                                                    if (/^".*?"\s*:$/.test(part)) return <span key={j} className="text-sky-300 font-bold">{part}</span>;
                                                    if (/^".*?"$/.test(part)) return <span key={j} className="text-emerald-400">{part}</span>;
                                                    if (/^(true|false)$/.test(part)) return <span key={j} className="text-amber-400 font-bold">{part}</span>;
                                                    if (/^\d+$/.test(part)) return <span key={j} className="text-blue-300 font-semibold">{part}</span>;
                                                    if (part === 'null') return <span key={j} className="text-rose-400">{part}</span>;
                                                    return <span key={j} className="text-slate-400">{part}</span>;
                                                })}
                                            </div>
                                        );
                                    });
                                })()}
                            </pre>
                        </div>
                        <footer className="bg-slate-50 p-6 border-t border-slate-100 text-right">
                            <button onClick={() => setSelectedResponse(null)} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Fechar</button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes das Etapas */}
            {selectedSteps && logForSteps && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        <header className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
                            <div>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Linha do Tempo</p>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">
                                    Detalhes da Execução
                                </h3>
                            </div>
                            <button onClick={() => { setSelectedSteps(null); setLogForSteps(null); }} className="text-slate-400 hover:text-rose-500 transition-colors text-xl leading-none">✕</button>
                        </header>
                        
                        <div className="p-6 overflow-auto flex-1 custom-scrollbar bg-white">
                            {selectedSteps.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 italic text-sm">Nenhum detalhe registrado para esta sincronização.</div>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 ml-3 pl-8 space-y-8">
                                    {selectedSteps.map((step, i) => (
                                        <div key={step.id} className="relative">
                                            {/* Dot */}
                                            <div className="absolute -left-[35px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    {new Date(step.createdAt).toLocaleTimeString('pt-BR')}
                                                </div>
                                                <div className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                                                    {step.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <footer className="bg-slate-50 p-6 border-t border-slate-100 text-right">
                            <button onClick={() => { setSelectedSteps(null); setLogForSteps(null); }} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Fechar</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
