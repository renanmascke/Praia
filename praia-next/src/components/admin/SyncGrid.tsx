'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SyncGridProps {
    showIMA?: boolean;
    showWeather?: boolean;
    className?: string;
}

export default function SyncGrid({ showIMA = true, showWeather = true, className = "mb-10" }: SyncGridProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [stepMessage, setStepMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleSync = async (type: 'ima' | 'weather' | 'marine' | 'ranking' | 'all') => {
        const labels = {
            ima: 'IMA',
            weather: 'CLIMA',
            marine: 'MAR',
            ranking: 'RANKING',
            all: 'COMPLETA'
        };

        if (!confirm(`Deseja iniciar a sincronização ${labels[type]} agora? Esta operação será executada em etapas para evitar timeouts.`)) return;

        const runId = crypto.randomUUID();
        setLoading(type);
        setStepMessage('Iniciando...');

        try {
            let finished = false;
            let iterations = 0;
            const maxIterations = 20; // Segurança contra loops infinitos

            while (!finished && iterations < maxIterations) {
                iterations++;
                const endpoint = type === 'all' ? '/api/sync-all' : `/api/sync-${type}`;
                const res = await fetch(`${endpoint}?runId=${runId}&silent=true`);
                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.error || "Erro desconhecido na etapa.");
                }

                if (data.finished) {
                    finished = true;
                } else {
                    // Atualiza a mensagem visual com o próximo passo sugerido pelo servidor
                    const nextStep = data.nextStep || '...';
                    setStepMessage(nextStep.toUpperCase());
                    
                    // Pequeno intervalo de segurança entre chamadas (1.5s)
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            if (iterations >= maxIterations) {
                throw new Error("Limite de etapas excedido. Verifique os logs.");
            }

            alert(`Sincronização ${labels[type]} finalizada com 100% de sucesso!`);
        } catch (error: any) {
            console.error(error);
            alert(`Falha na sincronização: ${error.message}`);
        } finally {
            setLoading(null);
            setStepMessage(null);
            router.refresh();
        }
    };

    const isAnyLoading = !!loading;

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 ${className}`}>
            {/* IMA */}
            <div className={`bg-white rounded-[1.5rem] p-5 border shadow-sm transition-all duration-300 ${isAnyLoading ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:border-emerald-200'}`}>
                <div className="flex flex-col h-full justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl border border-emerald-100">🧪</div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">IMA</h4>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Balneabilidade</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('ima')}
                        disabled={isAnyLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 disabled:shadow-none transition-all active:scale-95"
                    >
                        {loading === 'ima' ? (stepMessage || 'Executando...') : 'Sincronizar'}
                    </button>
                </div>
            </div>

            {/* CLIMA */}
            <div className={`bg-white rounded-[1.5rem] p-5 border shadow-sm transition-all duration-300 ${isAnyLoading ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:border-sky-200'}`}>
                <div className="flex flex-col h-full justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center text-2xl border border-sky-100">🌤️</div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Clima</h4>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Vento e Tempo</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('weather')}
                        disabled={isAnyLoading}
                        className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-sky-500/20 disabled:shadow-none transition-all active:scale-95"
                    >
                        {loading === 'weather' ? (stepMessage || 'Executando...') : 'Sincronizar'}
                    </button>
                </div>
            </div>

            {/* MAR */}
            <div className={`bg-white rounded-[1.5rem] p-5 border shadow-sm transition-all duration-300 ${isAnyLoading ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:border-indigo-200'}`}>
                <div className="flex flex-col h-full justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-2xl border border-indigo-100">🌊</div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Mar</h4>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Ondas e Maré</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('marine')}
                        disabled={isAnyLoading}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 disabled:shadow-none transition-all active:scale-95"
                    >
                        {loading === 'marine' ? (stepMessage || 'Executando...') : 'Sincronizar'}
                    </button>
                </div>
            </div>

            {/* RANKING */}
            <div className={`bg-white rounded-[1.5rem] p-5 border shadow-sm transition-all duration-300 ${isAnyLoading ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:border-orange-200'}`}>
                <div className="flex flex-col h-full justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-2xl border border-orange-100">🏆</div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Ranking</h4>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Cálculos Finais</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('ranking')}
                        disabled={isAnyLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20 disabled:shadow-none transition-all active:scale-95"
                    >
                        {loading === 'ranking' ? (stepMessage || 'Processando...') : 'Recalcular'}
                    </button>
                </div>
            </div>

            {/* COMPLETA */}
            <div className={`bg-slate-900 rounded-[1.5rem] p-5 border shadow-xl transition-all duration-300 ${isAnyLoading ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-2xl hover:bg-black'}`}>
                <div className="flex flex-col h-full justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">⚡</div>
                        <div>
                            <h4 className="font-black text-white uppercase tracking-tight text-sm">Completa</h4>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">IMA Clima Mar Rank</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('all')}
                        disabled={isAnyLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/30 disabled:shadow-none transition-all active:scale-95"
                    >
                        {loading === 'all' ? (stepMessage || 'Executando...') : 'Tudo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
