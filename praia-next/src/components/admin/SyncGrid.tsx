'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Activity, 
    CloudSun, 
    Waves, 
    Trophy, 
    Zap, 
    ArrowRight, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    Play,
    RefreshCw,
    Shield
} from 'lucide-react';

interface SyncGridProps {
    showIMA?: boolean;
    showWeather?: boolean;
    className?: string;
}

export default function SyncGrid({ showIMA = true, showWeather = true, className = "" }: SyncGridProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [stepMessage, setStepMessage] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);
    const router = useRouter();

    const handleSync = async (type: 'ima' | 'weather' | 'marine' | 'ranking' | 'all') => {
        const labels = {
            ima: 'IMA',
            weather: 'CLIMA',
            marine: 'MAR',
            ranking: 'RANKING',
            all: 'COMPLETA'
        };

        const STEP_NAMES: Record<string, string> = {
            ima: 'Sincronizando dados IMA',
            weather: 'Atualizando Clima e Ventos',
            marine: 'Processando Marés e Ondas',
            math: 'Calculando Índices Técnicos',
            'ai-block-0': 'IA: Análise Setor Norte',
            'ai-block-1': 'IA: Análise Setor Sul',
            'ai-block-2': 'IA: Análise Setor Leste',
            'ai-block-3': 'IA: Análise Setor Oeste',
            summary: 'Finalizando Relatório'
        };

        const RANKING_PIPELINE = ['math', 'ai-block-0', 'ai-block-1', 'ai-block-2', 'ai-block-3', 'summary'];
        const GLOBAL_PIPELINE = ['ima', 'weather', 'marine', ...RANKING_PIPELINE];

        if (!confirm(`Deseja iniciar a sincronização ${labels[type]}?`)) return;

        const runId = crypto.randomUUID();
        const pipeline = type === 'all' ? GLOBAL_PIPELINE : 
                        type === 'ranking' ? RANKING_PIPELINE : [type];
        
        setLoading(type);
        setProgress({ current: 0, total: pipeline.length });
        setStepMessage('Aquecendo motores...');

        try {
            let finished = false;
            let currentStepIdx = 0;
            const maxIterations = 25; 

            while (!finished && currentStepIdx < maxIterations) {
                const stepLabel = pipeline[currentStepIdx] || '...';
                const friendlyName = STEP_NAMES[stepLabel] || stepLabel;
                
                setStepMessage(`${friendlyName}`);
                setProgress({ current: currentStepIdx + 1, total: pipeline.length });

                const endpoint = type === 'all' ? '/api/sync-all' : `/api/sync-${type}`;
                const res = await fetch(`${endpoint}?runId=${runId}&silent=true`);
                
                let data: any;
                const contentType = res.headers.get("content-type");
                
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    console.error("Resposta não-JSON recebida:", text);
                    throw new Error(`Resposta inválida do servidor (Status ${res.status}).`);
                }

                if (!res.ok || !data.success) {
                    throw new Error(data.error || `Erro na etapa ${stepLabel} (Status ${res.status}).`);
                }

                if (data.finished || currentStepIdx >= pipeline.length - 1) {
                    finished = true;
                } else {
                    currentStepIdx++;
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }

            // Success state handling could be more visual, but keeping simple for now
        } catch (error: any) {
            console.error(error);
            alert(`Erro Crítico: ${error.message}`);
        } finally {
            setLoading(null);
            setStepMessage(null);
            setProgress(null);
            router.refresh();
        }
    };

    const isAnyLoading = !!loading;

    return (
        <div className={className}>
            {/* Global HUD for Progress */}
            {isAnyLoading && progress && (
                <div className="mb-6 bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/40 text-orange-500">
                                    <Loader2 size={24} className="animate-spin" />
                                </div>
                                <div>
                                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-0.5">Executor de Tarefas</p>
                                    <h3 className="text-lg font-bold tracking-tight text-white/90">
                                        {stepMessage}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest">Progresso</p>
                                <p className="text-white font-black text-lg leading-none">{Math.round((progress.current / progress.total) * 100)}%</p>
                            </div>
                        </div>
                        
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {/* Individual Action Cards rewritten for vertical stacking or small grid */}
                {[
                    { id: 'ima', label: 'IMA', sub: 'Balneabilidade', icon: <Activity className="text-emerald-500" />, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
                    { id: 'weather', label: 'Clima', sub: 'Vento e Tempo', icon: <CloudSun className="text-blue-500" />, color: 'bg-blue-500', bg: 'bg-blue-50' },
                    { id: 'marine', label: 'Maré', sub: 'Ondas e Marés', icon: <Waves className="text-indigo-500" />, color: 'bg-indigo-500', bg: 'bg-indigo-50' },
                    { id: 'ranking', label: 'Ranking', sub: 'Recalcular Notas', icon: <Trophy className="text-amber-500" />, color: 'bg-amber-500', bg: 'bg-amber-50' },
                ].map((item) => (
                    <div 
                        key={item.id}
                        className={`bg-white rounded-[1.5rem] p-4 border border-slate-200 transition-all duration-300 flex items-center justify-between group ${isAnyLoading ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400 hover:shadow-lg'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center transition-all group-hover:scale-110`}>
                                {item.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.label}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sub}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleSync(item.id as any)}
                            disabled={isAnyLoading}
                            className={`p-2 rounded-xl transition-all ${isAnyLoading ? 'text-slate-200' : 'text-slate-400 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-100'}`}
                        >
                            <RefreshCw size={18} className={loading === item.id ? 'animate-spin' : ''} />
                        </button>
                    </div>
                ))}

                {/* Master Action */}
                <button
                    onClick={() => handleSync('all')}
                    disabled={isAnyLoading}
                    className={`mt-2 w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all relative overflow-hidden group ${
                        isAnyLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black shadow-xl'
                    }`}
                >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm tracking-tight">Sincronização Total</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Executar Pipeline Completo</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                    {!isAnyLoading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
                </button>
            </div>
        </div>
    );
}
