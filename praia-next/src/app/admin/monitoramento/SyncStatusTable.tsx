'use client';

import React, { useState } from 'react';
import { getSyncSteps } from '@/lib/sync-actions';
import { 
    Activity, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Play, 
    Database, 
    ChevronRight, 
    Code, 
    History, 
    X,
    Layers,
    Waves,
    Umbrella,
    Trophy,
    Zap,
    Settings,
    Loader2
} from 'lucide-react';

export default function SyncStatusTable({ logs }: { logs: any[] }) {
    const [selectedResponse, setSelectedResponse] = useState<any>(null);
    const [selectedSteps, setSelectedSteps] = useState<any[] | null>(null);
    const [loadingSteps, setLoadingSteps] = useState<string | null>(null);
    const [logForSteps, setLogForSteps] = useState<any>(null);
    const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());

    const formatDuration = (start: Date, end: Date | null) => {
        if (!end) return 'Processando...';
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
        const config: Record<string, { icon: React.ReactNode, class: string, label: string }> = {
            IMA: { icon: <Activity size={10} />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'IMA' },
            WEATHER: { icon: <Umbrella size={10} />, class: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Tempo' },
            MARINE: { icon: <Waves size={10} />, class: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Maré' },
            RANKING: { icon: <Trophy size={10} />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Ranking' },
            ALL: { icon: <Zap size={10} />, class: 'bg-slate-900 text-white border-slate-700', label: 'Full Sync' }
        };
        return config[type] || { icon: <Settings size={10} />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: type };
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { icon: React.ReactNode, class: string, label: string }> = {
            SUCCESS: { icon: <CheckCircle2 size={12} />, class: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'Sucesso' },
            PARTIAL: { icon: <AlertTriangle size={12} />, class: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Parcial' },
            RUNNING: { icon: <Loader2 size={12} className="animate-spin" />, class: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse', label: 'Executando' },
            FAILED: { icon: <X size={12} />, class: 'bg-rose-50 text-rose-600 border-rose-200', label: 'Falhou' }
        };
        const config = configs[status] || configs.FAILED;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-xl border ${config.class}`}>
                {config.icon}
                {config.label}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md">
                        <tr className="border-b border-slate-100">
                            <th className="p-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 w-[60px]"></th>
                            <th className="p-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Serviços Ativados</th>
                            <th className="p-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Timeline</th>
                            <th className="p-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center">Steps</th>
                            <th className="p-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center">Status Global</th>
                            <th className="p-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Último Log</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-24 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <History size={48} className="text-slate-200" />
                                        <p className="text-slate-800 font-bold uppercase tracking-widest text-xs">Nenhum registro de atividade</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((exec) => {
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
                                            className={`hover:bg-blue-50/30 transition-all cursor-pointer group ${isExpanded ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => toggleExecution(exec.executionId)}
                                        >
                                            <td className="p-5 px-6 text-center">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-slate-100 group-hover:bg-blue-500 group-hover:text-white ${isExpanded ? 'bg-blue-600 text-white rotate-90' : 'text-slate-400'}`}>
                                                    <ChevronRight size={16} strokeWidth={3} />
                                                </div>
                                            </td>
                                            <td className="p-5 px-6">
                                                <div className="flex flex-wrap gap-2">
                                                    {types.map((type: string) => {
                                                        const c = getBadgeConfig(type);
                                                        return (
                                                            <span key={type} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all group-hover:border-transparent ${c.class}`}>
                                                                {c.icon}
                                                                {c.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-5 px-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 leading-tight">
                                                        <Clock size={12} className="text-slate-400" />
                                                        {new Date(exec.startTime).toLocaleString('pt-BR')}
                                                    </div>
                                                    {exec.endTime && (
                                                        <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1 opacity-70">
                                                            Dur: {formatDuration(exec.startTime, exec.endTime)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 px-6 text-center">
                                                <div className="inline-flex items-center justify-center bg-white border border-slate-200 w-8 h-8 rounded-full shadow-sm">
                                                    <span className="text-[10px] font-black text-slate-800">
                                                        {exec.stepCount}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5 px-6 text-center">
                                                {getStatusBadge(globalStatus)}
                                            </td>
                                            <td className="p-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-medium text-slate-500 truncate max-w-[280px]" title={exec.lastMessage}>
                                                        {exec.lastMessage || '--'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>

                                        {isExpanded && steps.map((step: any, idx: number) => (
                                            <tr key={step.id} className="bg-slate-50 border-l-[6px] border-blue-500 animate-in fade-in slide-in-from-left-2 transition-all hover:bg-white">
                                                <td className="p-4 px-6 relative overflow-hidden">
                                                    {idx < steps.length - 1 && <div className="absolute left-1/2 top-4 bottom-0 w-px bg-blue-100 -translate-x-1/2" />}
                                                </td>
                                                <td className="p-4 px-6">
                                                    {(() => {
                                                        const c = getBadgeConfig(step.type);
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-slate-200 bg-white text-slate-600`}>
                                                                <span className="opacity-50 group-hover:opacity-100 transition-opacity">{c.icon}</span>
                                                                {c.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 px-6">
                                                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                                                        <Play size={10} className="text-blue-400" />
                                                        {new Date(step.startTime).toLocaleTimeString('pt-BR')}
                                                    </div>
                                                </td>
                                                <td className="p-4 px-6 text-center">
                                                    {step.stepCount > 0 && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleViewSteps(step); }}
                                                            disabled={loadingSteps === step.id}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                                                        >
                                                            {loadingSteps === step.id ? <Loader2 size={10} className="animate-spin" /> : <Layers size={10} />}
                                                            {loadingSteps === step.id ? 'Loading' : `Etapas (${step.stepCount})`}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-4 px-6 text-center scale-90">
                                                    {getStatusBadge(step.status)}
                                                </td>
                                                <td className="p-4 px-6">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <p className="text-[11px] font-medium text-slate-400 truncate max-w-[200px]" title={step.message}>
                                                            {step.message || '--'}
                                                        </p>
                                                        {step.response && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setSelectedResponse(step); }}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-blue-600 transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-200"
                                                            >
                                                                <Code size={12} />
                                                                JSON
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* JSON Output Modal */}
            {selectedResponse && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedResponse(null)} />
                    <div className="bg-[#0f172a] rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] relative z-10">
                        <header className="px-8 py-6 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-white/5 text-blue-400">
                                    <Database size={24} />
                                </div>
                                <h3 className="font-bold text-white text-xl tracking-tight leading-tight">Data Response Buffer</h3>
                            </div>
                            <button onClick={() => setSelectedResponse(null)} className="p-2.5 bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-400 rounded-xl transition-all"><X size={20} /></button>
                        </header>
                        <div className="p-8 overflow-auto flex-1 custom-scrollbar">
                            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-blue-200/90">
                                {JSON.stringify(typeof selectedResponse.response === 'string' ? JSON.parse(selectedResponse.response) : selectedResponse.response, null, 2)}
                            </pre>
                        </div>
                        <footer className="px-8 py-6 border-t border-white/5 bg-white/5 flex justify-end shrink-0">
                            <button onClick={() => setSelectedResponse(null)} className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-blue-500 hover:text-white transition-all">Close Instance</button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Steps Timeline Modal */}
            {selectedSteps && logForSteps && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => { setSelectedSteps(null); setLogForSteps(null); }} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] relative z-10">
                        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                                    <Layers size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-xl tracking-tight leading-tight">Timeline Orchestration</h3>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Iteração de processos em lote</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedSteps(null); setLogForSteps(null); }} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-transparent hover:border-slate-200"><X size={20} /></button>
                        </header>
                        <div className="p-10 overflow-auto flex-1 custom-scrollbar bg-slate-50/20">
                            <div className="relative border-l-2 border-slate-100 ml-4 pl-10 space-y-10">
                                {selectedSteps.map((step: any, idx: number) => (
                                    <div key={step.id} className="relative group">
                                        <div className="absolute -left-[49px] top-1.5 w-[18px] h-[18px] rounded-full bg-white border-4 border-blue-500 shadow-lg shadow-blue-100 group-hover:scale-125 transition-all" />
                                        <div className="space-y-2">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                <Clock size={10} />
                                                {new Date(step.createdAt).toLocaleTimeString('pt-BR')}
                                            </div>
                                            <div className="text-sm font-medium text-slate-700 leading-relaxed bg-white p-5 rounded-[1.5rem] border border-slate-100 group-hover:border-blue-200 transition-all shadow-sm">
                                                {step.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <footer className="px-8 py-6 border-t border-slate-100 flex justify-center shrink-0">
                            <button onClick={() => { setSelectedSteps(null); setLogForSteps(null); }} className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">Acknowledge</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
