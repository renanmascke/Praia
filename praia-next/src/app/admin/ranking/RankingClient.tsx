'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatRegionLocale } from '@/lib/formatters';
import { renderBoldText } from '@/lib/ui-utils';
import { 
    Trophy, 
    MapPin, 
    Calendar, 
    Target, 
    Sparkles, 
    TrendingUp, 
    ShieldCheck, 
    ClipboardList,
    ChevronRight,
    Search,
    Loader2
} from 'lucide-react';

interface RankingItem {
    id: string;
    position: number;
    score: number;
    status: string;
    totalPoints: number;
    proprioCount: number;
    improprioCount: number;
    aiCommentary?: string | null;
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
    const [citySummary, setCitySummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchRankings = async () => {
        setLoading(true);
        setCitySummary(null);
        try {
            const res = await fetch(`/api/rankings?cityId=${selectedCity}&date=${selectedDate}&anchorId=${selectedAnchor}`);
            const data = await res.json();
            if (data.success) {
                setRankings(data.data);
                setCitySummary(data.summary);
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
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ranking Diário</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Classificação baseada em balneabilidade, vento e previsão.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Live Updates</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 relative overflow-hidden">
                <div className="space-y-2 relative z-10">
                    <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-2">
                        <MapPin size={14} className="text-blue-500" /> Cidade
                    </label>
                    <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        {initialCities.map(city => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-2">
                        <Target size={14} className="text-blue-500" /> Ponto de Previsão
                    </label>
                    <select
                        value={selectedAnchor}
                        onChange={(e) => setSelectedAnchor(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Todos os Pontos</option>
                        {initialAnchors.map(anchor => (
                            <option key={anchor.id} value={anchor.id}>{anchor.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" /> Data do Ranking
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    />
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Search size={120} />
                </div>
            </div>

            {/* Resumo da Cidade (Expert Analysis) */}
            {citySummary && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 shadow-xl shadow-blue-200 relative overflow-hidden group border border-blue-500/20">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-white/15 transition-all duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl"></div>
                    
                    <div className="relative flex gap-6 items-start">
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 shadow-inner group-hover:scale-110 transition-transform duration-500 shrink-0">
                            <Sparkles size={32} className="text-white fill-white/20" />
                        </div>
                        <div className="space-y-3 flex-1">
                            <h2 className="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]">Análise Estratégica</h2>
                            <div className="text-white text-lg font-medium leading-relaxed max-w-4xl">
                                {renderBoldText(citySummary)}
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <span className="w-6 h-px bg-white/30"></span>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Relatório Gerado via IA</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Listagem do Ranking */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Trophy size={16} className="text-amber-500" /> Classificação de Performance Diária
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        <span>{rankings.length} Praias Encontradas</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="bg-white border border-slate-200 rounded-[2rem] p-24 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            <div className="text-center">
                                <p className="text-slate-800 font-bold">Processando Datasets</p>
                                <p className="text-slate-400 text-xs mt-1">Calculando scores baseado em ventos e laudos...</p>
                            </div>
                        </div>
                    ) : rankings.length > 0 ? (
                        rankings.map((item) => (
                            <div key={item.id} className="group relative bg-white hover:bg-slate-50 p-5 rounded-[2rem] border border-slate-200 hover:border-blue-400 shadow-sm transition-all duration-300">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Posição e Nome */}
                                    <div className="flex items-center gap-6 min-w-[300px]">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl transition-all duration-300 ${
                                            item.position === 1 ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-inner' :
                                            item.position === 2 ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                            item.position === 3 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 
                                            'bg-slate-50 text-slate-400 border border-slate-100'
                                        }`}>
                                            {item.position}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                 <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                    {item.beach.name}
                                                </h3>
                                                {item.position === 1 && <Sparkles size={16} className="text-amber-500" />}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <MapPin size={10} className="text-slate-400" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{formatRegionLocale(item.beach.region)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de Score */}
                                    <div className="flex-1 space-y-2.5">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <TrendingUp size={12} className="text-emerald-500" /> Score de Indicação
                                                </span>
                                                {item.aiCommentary && (
                                                    <span className="bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded-lg font-bold tracking-tight uppercase shadow-lg shadow-blue-500/20">Alpha IA</span>
                                                )}
                                            </div>
                                            <span className={`text-xl font-bold tracking-tighter ${
                                                item.score > 80 ? 'text-emerald-600' : item.score > 50 ? 'text-blue-600' : 'text-rose-600'
                                            }`}>{Math.round(item.score)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 p-1 rounded-full h-5 border border-slate-200/50 shadow-inner overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 rounded-full shadow-sm ${
                                                    item.score > 80 ? 'bg-emerald-500 shadow-emerald-500/30' :
                                                    item.score > 50 ? 'bg-blue-500 shadow-blue-500/30' : 
                                                    'bg-rose-500 shadow-rose-500/30'
                                                }`}
                                                style={{ width: `${item.score}%` }}
                                            />
                                        </div>
                                        {item.aiCommentary && (
                                            <div className="mt-3 bg-white/50 border border-slate-100 p-4 rounded-2xl relative">
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed pr-8 italic">
                                                    "{renderBoldText(item.aiCommentary)}"
                                                </p>
                                                <Sparkles size={14} className="absolute top-4 right-4 text-blue-400 opacity-50" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Status IMA e Laudos */}
                                    <div className="flex items-center gap-8 lg:ml-8 shrink-0 min-w-[300px] justify-end">
                                        <div className="text-right space-y-1.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                                                <ShieldCheck size={12} className="text-blue-500" /> Balneabilidade
                                            </p>
                                            <span className={`inline-flex px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm border ${
                                                item.status.includes('Indeterminado') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                item.status === 'Própria' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                item.status === 'Mista' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        
                                        <div className="h-10 w-px bg-slate-200 hidden lg:block"></div>

                                        <div className="space-y-1.5 text-center min-w-[100px]">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                                <ClipboardList size={12} className="text-blue-500" /> Histórico
                                            </p>
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="px-3 py-1 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                    <span className="text-sm font-bold text-emerald-600">{item.proprioCount}</span>
                                                    <span className="text-[9px] font-black text-slate-300 ml-1">P</span>
                                                </div>
                                                <div className="px-3 py-1 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                    <span className="text-sm font-bold text-rose-600">{item.improprioCount}</span>
                                                    <span className="text-[9px] font-black text-slate-300 ml-1">I</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden group-hover:block transition-all animate-in fade-in slide-in-from-left-2">
                                            <ChevronRight size={20} className="text-slate-300" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Calendar size={48} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Sem Dados para esta Data</h3>
                            <p className="text-slate-500 mt-2 max-w-sm">Tente selecionar uma cidade diferente ou altere o ponto de ancoragem para recalcular o ranking.</p>
                            <button onClick={fetchRankings} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                                Recalcular Agora
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
