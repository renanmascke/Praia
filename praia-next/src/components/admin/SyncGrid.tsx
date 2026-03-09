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
    const router = useRouter();

    const handleSync = async (type: 'ima' | 'weather' | 'marine' | 'ranking' | 'all') => {
        const labels = {
            ima: 'IMA',
            weather: 'CLIMA',
            marine: 'MAR',
            ranking: 'RANKING',
            all: 'COMPLETA'
        };

        if (!confirm(`Deseja iniciar a sincronização ${labels[type]} agora?`)) return;

        setLoading(type);
        try {
            const endpoint = `/api/sync-${type}`;
            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.success) {
                alert(`Sincronização ${labels[type]} finalizada com sucesso!`);
            } else {
                alert(`Erro: ${data.error || 'Falha desconhecida'}`);
            }
        } catch (error: any) {
            alert(`Falha na requisição: ${error.message}`);
        } finally {
            setLoading(null);
            router.refresh();
        }
    };

    const isAnyLoading = !!loading;

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Card Principal de Destaque - Sincronização Completa */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 border border-white/10 shadow-2xl group">
                {/* Efeito de fundo decorativo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-orange-500/20 transition-all duration-700" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-16 -mb-16" />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-orange-500/40 relative animate-pulse">
                            ⚡
                            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-20" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="font-black text-white uppercase tracking-tight text-2xl lg:text-3xl">Sincronização Completa</h3>
                            <p className="text-slate-400 font-medium mt-1 flex items-center justify-center md:justify-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                IMA → Clima → Mar → Ranking
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleSync('all')}
                        disabled={isAnyLoading}
                        className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-sm shadow-xl shadow-orange-500/30 disabled:shadow-none transition-all active:scale-95 disabled:cursor-not-allowed group/btn"
                    >
                        {loading === 'all' ? (
                            <span className="flex items-center gap-3">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processando...
                            </span>
                        ) : 'Executar Sincronismo Total'}
                    </button>
                </div>
            </div>

            {/* Grid de Cards Individuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            {loading === 'ima' ? 'Executando...' : 'Sincronizar'}
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
                            {loading === 'weather' ? 'Executando...' : 'Sincronizar'}
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
                            {loading === 'marine' ? 'Executando...' : 'Sincronizar'}
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
                            {loading === 'ranking' ? 'Processando...' : 'Recalcular'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
