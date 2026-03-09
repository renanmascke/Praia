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

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
            {/* Card Completo */}
            <div className="bg-slate-800 rounded-3xl p-5 px-6 border border-slate-700 shadow-xl flex items-center justify-between group hover:bg-slate-900 transition-all col-span-full mb-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/20">
                        ⚡
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase tracking-tight text-lg">Sincronização Completa</h3>
                        <p className="text-slate-400 text-xs font-medium">IMA → Clima → Mar → Ranking</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSync('all')}
                    disabled={!!loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/40 disabled:opacity-50 transition-all active:scale-95"
                >
                    {loading === 'all' ? 'Processando Tudo...' : 'Executar Agora'}
                </button>
            </div>

            {/* Card IMA */}
            {showIMA && (
                <div className="bg-white rounded-3xl p-4 px-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            🧪
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">IMA</h3>
                            <p className="text-slate-500 text-xs font-medium">Balneabilidade</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('ima')}
                        disabled={!!loading}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm disabled:opacity-50 transition-all active:scale-95"
                    >
                        {loading === 'ima' ? 'Carregando' : 'Sincronizar'}
                    </button>
                </div>
            )}

            {/* Card Weather */}
            {showWeather && (
                <div className="bg-white rounded-3xl p-4 px-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-sky-200 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            🌤️
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">Clima</h3>
                            <p className="text-slate-500 text-xs font-medium">Vento e Previsão</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('weather')}
                        disabled={!!loading}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm disabled:opacity-50 transition-all active:scale-95"
                    >
                        {loading === 'weather' ? 'Carregando' : 'Sincronizar'}
                    </button>
                </div>
            )}

            {/* Card Marine */}
            <div className="bg-white rounded-3xl p-4 px-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        🌊
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Mar</h3>
                        <p className="text-slate-500 text-xs font-medium">Ondulação e Maré</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSync('marine')}
                    disabled={!!loading}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm disabled:opacity-50 transition-all active:scale-95"
                >
                    {loading === 'marine' ? 'Carregando' : 'Sincronizar'}
                </button>
            </div>

            {/* Card Ranking */}
            <div className="bg-white rounded-3xl p-4 px-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        🏆
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Ranking</h3>
                        <p className="text-slate-500 text-xs font-medium">Recalcular Scores</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSync('ranking')}
                    disabled={!!loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm disabled:opacity-50 transition-all active:scale-95"
                >
                    {loading === 'ranking' ? 'Processando' : 'Recalcular'}
                </button>
            </div>
        </div>
    );
}
