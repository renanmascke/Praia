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

    const handleSync = async (type: 'ima' | 'weather' | 'ranking') => {
        if (!confirm(`Deseja iniciar a sincronização do ${type.toUpperCase()} agora?`)) return;

        setLoading(type);
        try {
            let endpoint = '';
            if (type === 'ima') endpoint = '/api/sync-ima';
            else if (type === 'weather') endpoint = '/api/sync-weather';
            else if (type === 'ranking') endpoint = '/api/sync-ranking';

            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.success) {
                alert(`${type.toUpperCase()} finalizado com sucesso!`);
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error: any) {
            alert(`Falha na requisição: ${error.message}`);
        } finally {
            setLoading(null);
            router.refresh();
        }
    };

    return (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
            {/* Card IMA */}
            {showIMA && (
                <div className="bg-white rounded-3xl p-4 px-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            🧪
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">Sincronização IMA</h3>
                            <p className="text-slate-500 text-xs font-medium">Histórico de balneabilidade</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('ima')}
                        disabled={!!loading}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {loading === 'ima' ? 'Carregando...' : 'Atualizar'}
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
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">Sincronização Clima</h3>
                            <p className="text-slate-500 text-xs font-medium">Previsão e condições tempo</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleSync('weather')}
                        disabled={!!loading}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md shadow-sky-500/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {loading === 'weather' ? 'Carregando...' : 'Atualizar'}
                    </button>
                </div>
            )}

            {/* Card Ranking */}
            <div className="bg-white rounded-3xl p-4 px-6 border border-slate-200 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        🏆
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Recalcular Ranking</h3>
                        <p className="text-slate-500 text-xs font-medium">Processar scores e posições</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSync('ranking')}
                    disabled={!!loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-95"
                >
                    {loading === 'ranking' ? 'Processando...' : 'Recalcular'}
                </button>
            </div>
        </div>
    );
}
