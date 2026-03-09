'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatRegionLocale } from '@/lib/formatters';

interface RankingItem {
    id: string;
    position: number;
    score: number;
    status: string;
    totalPoints: number;
    proprioCount: number;
    improprioCount: number;
    beach: {
        name: string;
        region: string;
    };
}

export default function RankingClient({ initialCities, initialAnchors }: { initialCities: any[], initialAnchors: any[] }) {
    const [selectedCity, setSelectedCity] = useState(initialCities[0]?.id || '');
    const [selectedAnchor, setSelectedAnchor] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [rankings, setRankings] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/rankings?cityId=${selectedCity}&date=${selectedDate}&anchorId=${selectedAnchor}`);
            const data = await res.json();
            if (data.success) {
                setRankings(data.data);
            }
        } catch (error) {
            console.error("Erro ao buscar rankings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCity && selectedDate) {
            fetchRankings();
        }
    }, [selectedCity, selectedDate, selectedAnchor]);

    return (
        <div className="flex flex-col gap-6 flex-1 min-h-0">
            {/* Filtros */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cidade</label>
                    <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                    >
                        {initialCities.map(city => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ponto de Previsão</label>
                    <select
                        value={selectedAnchor}
                        onChange={(e) => setSelectedAnchor(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Todos os Pontos</option>
                        {initialAnchors.map(anchor => (
                            <option key={anchor.id} value={anchor.id}>{anchor.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data do Ranking</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                    />
                </div>
            </div>

            {/* Listagem do Ranking */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Atualizando Ranking...</p>
                        </div>
                    ) : rankings.length > 0 ? (
                        rankings.map((item) => (
                            <div key={item.id} className="group relative bg-slate-50/50 hover:bg-white p-4 rounded-2xl border border-transparent hover:border-orange-100 transition-all duration-300">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    {/* Posição e Nome */}
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${item.position === 1 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' :
                                            item.position === 2 ? 'bg-slate-300 text-slate-700' :
                                                item.position === 3 ? 'bg-amber-600/20 text-amber-700' : 'bg-slate-200 text-slate-500'
                                            }`}>
                                            {item.position}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 tracking-tight group-hover:text-orange-600 transition-colors uppercase text-sm">
                                                {item.beach.name}
                                            </h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatRegionLocale(item.beach.region)}</p>
                                        </div>
                                    </div>

                                    {/* Barra de Score */}
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Indicação</span>
                                            <span className="text-sm font-black text-slate-800">{Math.round(item.score)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 rounded-full ${item.score > 80 ? 'bg-emerald-500' :
                                                    item.score > 50 ? 'bg-orange-400' : 'bg-rose-500'
                                                    }`}
                                                style={{ width: `${item.score}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Status IMA e Pontos */}
                                    <div className="flex items-center gap-6 lg:ml-6 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 min-w-[280px] justify-end">
                                        <div className="space-y-1 w-32 shrink-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status IMA</p>
                                            <div className="flex">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase whitespace-nowrap w-full text-center ${item.status.includes('Indeterminado') ? 'bg-amber-100 text-amber-600' :
                                                    item.status === 'Própria' ? 'bg-emerald-100 text-emerald-600' :
                                                        item.status === 'Mista' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center truncate">Laudos</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex flex-col items-center bg-emerald-50 px-2 py-1 rounded-lg min-w-[32px]">
                                                    <span className="text-[10px] font-black text-emerald-600 leading-none">{item.proprioCount}</span>
                                                    <span className="text-[8px] font-bold text-emerald-400 uppercase leading-none mt-0.5">P</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-rose-50 px-2 py-1 rounded-lg min-w-[32px]">
                                                    <span className="text-[10px] font-black text-rose-600 leading-none">{item.improprioCount}</span>
                                                    <span className="text-[8px] font-bold text-rose-400 uppercase leading-none mt-0.5">I</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <span className="text-6xl mb-4">🏜️</span>
                            <p className="font-black uppercase tracking-[0.2em] text-sm text-slate-400">Nenhum ranking para esta data</p>
                            <p className="text-xs font-medium text-slate-400 mt-2">Tente outra cidade ou dispare o recalculo manual.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
