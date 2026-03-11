'use client';

import React, { useState } from 'react';
import { getSyncSteps } from '@/lib/sync-actions';

export default function SyncStatusTable({ logs }: { logs: any[] }) {
    const [selectedResponse, setSelectedResponse] = useState<any>(null);
    const [selectedSteps, setSelectedSteps] = useState<any[] | null>(null);
    const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
    const [logForSteps, setLogForSteps] = useState<any>(null);
    const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());

    const formatDuration = (start: Date, end: Date | null) => {
        if (!end) return 'Em andamento...';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return `${(diff / 1000).toFixed(1)}s`;
    };

    const toggleExecution = (id: string) => {
        const next = new Set(expandedExecutions);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedExecutions(next);
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

    const getBadgeConfig = (type: string) => {
        const config: Record<string, { icon: string, class: string }> = {
            IMA: { icon: '🧪', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            WEATHER: { icon: '🌤️', class: 'bg-sky-50 text-sky-600 border-sky-100' },
            MARINE: { icon: '🌊', class: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
            RANKING: { icon: '🏆', class: 'bg-orange-50 text-orange-600 border-orange-100' },
            ALL: { icon: '⚡', class: 'bg-slate-800 text-white border-slate-700' }
        };
        return config[type] || { icon: '⚙️', class: 'bg-slate-50 text-slate-600 border-slate-100' };
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, string> = {
            SUCCESS: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            PARTIAL: 'bg-amber-50 text-amber-600 border-amber-200',
            RUNNING: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
            FAILED: 'bg-rose-50 text-rose-600 border-rose-200'
        };
        const labels: Record<string, string> = {
            SUCCESS: 'Sucesso',
            PARTIAL: 'Parcial',
            RUNNING: 'Executando',
            FAILED: 'Falhou'
        };
        return (
            <span className={`px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full border ${configs[status] || configs.FAILED}`}>
                {labels[status] || 'Desconhecido'}
            </span>
        );
    };

    return (
        <div className="overflow-x-auto relative h-full">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <tr className="border-b border-slate-200">
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[5%]"></th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Serviços</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Início / Fim</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-[10%]">Passos</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-[15%]">Status</th>
                        <th className="p-2.5 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[35%]">Última Mensagem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.map((exec) => {
                        const isExpanded = expandedExecutions.has(exec.executionId);
                        const steps = typeof exec.stepsJson === 'string' ? JSON.parse(exec.stepsJson) : exec.stepsJson;
                        const types = exec.types.split(',');
                        const statuses = exec.statuses.split(',');
                        const globalStatus = statuses.includes('RUNNING') ? 'RUNNING' : 
                                           statuses.includes('FAILED') ? (statuses.includes('SUCCESS') ? 'PARTIAL' : 'FAILED') : 
                                           'SUCCESS';

                        return (
                            <React.Fragment key={exec.executionId}>
                                <tr 
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => toggleExecution(exec.executionId)}
                                >
                                    <td className="p-2.5 px-4 text-center">
                                        <span className={`text-[10px] transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                    </td>
                                    <td className="p-2.5 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {types.map((type: string) => {
                                                const c = getBadgeConfig(type);
                                                return (
                                                    <span key={type} className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${c.class}`}>
                                                        {type}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-2.5 px-4">
                                        <div className="text-[10px] font-bold text-slate-700">
                                            {new Date(exec.startTime).toLocaleString('pt-BR')}
                                        </div>
                                        {exec.endTime && (
                                            <div className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                                Duração: {formatDuration(exec.startTime, exec.endTime)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2.5 px-4 text-center">
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {exec.stepCount}
                                        </span>
                                    </td>
                                    <td className="p-2.5 px-4 text-center">
                                        {getStatusBadge(globalStatus)}
                                    </td>
                                    <td className="p-2.5 px-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-[10px] font-medium text-slate-500 truncate max-w-[300px]" title={exec.lastMessage}>
                                                {exec.lastMessage || '--'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>

                                {isExpanded && steps.map((step: any) => (
                                    <tr key={step.id} className="bg-slate-50/50 border-l-4 border-blue-400 animate-in fade-in slide-in-from-left-2 duration-200">
                                        <td className="p-2 px-4"></td>
                                        <td className="p-2 px-4 opacity-70">
                                            {(() => {
                                                const c = getBadgeConfig(step.type);
                                                return (
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${c.class} flex items-center gap-1 w-fit`}>
                                                        {c.icon} {step.type}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-2 px-4">
                                            <div className="text-[9px] font-bold text-slate-500">
                                                {new Date(step.startTime).toLocaleTimeString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="p-2 px-4 text-center">
                                            {step.stepCount > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleViewSteps(step); }}
                                                    disabled={loadingSteps === step.id}
                                                    className="text-[8px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-700 transition-colors"
                                                >
                                                    {loadingSteps === step.id ? '...' : `Det. (${step.stepCount})`}
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-2 px-4 text-center">
                                            {getStatusBadge(step.status)}
                                        </td>
                                        <td className="p-2 px-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[9px] font-medium text-slate-400 truncate max-w-[250px]" title={step.message}>
                                                    {step.message || '--'}
                                                </p>
                                                {step.response && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedResponse(step); }}
                                                        className="text-[8px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-600 shrink-0"
                                                    >
                                                        JSON
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                    {logs.length === 0 && (
                        <tr><td colSpan={6} className="p-10 text-center text-slate-500 text-sm italic">Nenhum registro de sincronização encontrado.</td></tr>
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
                            <button onClick={() => setSelectedResponse(null)} className="text-slate-400 hover:text-rose-500 transition-colors text-xl leading-none">✕</button>
                        </header>
                        <div className="p-6 bg-[#0f172a] overflow-auto flex-1 custom-scrollbar">
                            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                {JSON.stringify(typeof selectedResponse.response === 'string' ? JSON.parse(selectedResponse.response) : selectedResponse.response, null, 2)}
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
                            <div className="relative border-l-2 border-slate-100 ml-3 pl-8 space-y-8">
                                {selectedSteps.map((step: any) => (
                                    <div key={step.id} className="relative">
                                        <div className="absolute -left-[35px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Date(step.createdAt).toLocaleTimeString('pt-BR')}
                                            </div>
                                            <div className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                {step.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
