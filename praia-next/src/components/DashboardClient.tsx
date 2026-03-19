'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatWindLocale, formatRegionLocale } from '@/lib/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Droplets,
    Wind,
    ChevronRight,
    BarChart3,
    Zap,
    Clock,
    AlertTriangle
} from 'lucide-react';
import WeatherChart from './WeatherChart';

type DayPayload = {
    date: string; // yyyy-mm-dd
    summary: string | null;
    forecast: any;
    rankings: {
        best: any[];
        worst: any[];
    };
};

export default function DashboardClient({
    initialDays
}: {
    initialDays: DayPayload[];
}) {
    const [selectedDayIdx, setSelectedDayIdx] = useState(0);
    const [query, setQuery] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [isRankingExpanded, setIsRankingExpanded] = useState(false);

    const selectedDay = initialDays[selectedDayIdx] || initialDays[0];
    const selectedForecast = selectedDay?.forecast;
    const citySummary = selectedDay?.summary || "";
    const ranking = selectedDay?.rankings ?? { best: [], worst: [] };

    const hourlyJSON = useMemo(() => {
        if (!selectedForecast?.hourlyData) return [];
        const raw = selectedForecast.hourlyData as any;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'object') {
            const first = Object.values(raw as any)[0];
            return Array.isArray(first) ? first : [];
        }
        return [];
    }, [selectedForecast]);

    const chartData = useMemo(
        () =>
            hourlyJSON.map((h: any) => ({
                time: typeof h.time === 'string' ? h.time : String(h.time),
                temp: h.temp ?? h.temperature ?? 0,
                rain: h.rainAmount ?? h.rain ?? 0,
                wind: h.windSpeed ?? h.wind ?? 0,
            })),
        [hourlyJSON],
    );

    const handleAskAi = async () => {
        if (!query.trim()) return;
        setLoadingChat(true);
        try {
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                body: JSON.stringify({ query, context: { date: selectedDay?.date } })
            });
            const data = await res.json();
            setAiResponse(data.reply);
        } finally {
            setLoadingChat(false);
        }
    };

    if (initialDays.length === 0) return null;
    if (!selectedDay || !selectedForecast) return <LoadingSkeleton />;

    const isGoodDay = (ranking.best?.length || 0) > (ranking.worst?.length || 0);
    const tempAvg = Math.round(((selectedForecast.tempMax || 0) + (selectedForecast.tempMin || 0)) / 2);

    return (
        <div className="space-y-8">
            {/* Seletor de Datas */}
            <section className="mb-8 overflow-x-auto no-scrollbar">
                <div className="flex justify-start md:justify-center min-w-max pb-2">
                    <div id="date-selector" className="inline-flex bg-slate-200/70 rounded-xl p-1 shadow-inner border border-slate-200 gap-1">
                        {initialDays.map((day, idx) => {
                            const dateObj = new Date(day.date + 'T12:00:00');
                            const isActive = selectedDayIdx === idx;
                            return (
                                <button
                                    key={day.date}
                                    onClick={() => setSelectedDayIdx(idx)}
                                    className={`date-btn px-4 py-2 rounded-lg font-bold text-[10px] transition-all focus:outline-none uppercase tracking-tighter flex flex-col items-center justify-center leading-tight min-w-[65px] ${isActive ? 'bg-white text-sky-600 shadow-sm active' : 'text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="block">{idx === 0 ? 'Hoje' : format(dateObj, 'eee', { locale: ptBR })}</span>
                                    <span className="text-[8px] font-normal opacity-70 block -mt-0.5 leading-none">{format(dateObj, 'dd/MM')}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Dashboard Modular */}
            <div id="app-container" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative text-sm">

                {/* Bloco 1: Veredito */}
                <div id="section-verdict" className={`p-8 text-center border-b border-slate-100 transition-all duration-700 ${isGoodDay ? 'bg-emerald-50/20' : 'bg-rose-50/20'}`}>
                    <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-slate-400" id="current-date-label">
                        {format(new Date(selectedDay.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-1 min-h-[40px]">
                        <div id="verdict-text" className="text-2xl md:text-3xl font-black tracking-tighter leading-tight uppercase flex items-center gap-2 text-slate-800">
                            {/* Emoji dinâmico aqui se necessário */}
                            <span className={isGoodDay ? 'text-emerald-600' : 'text-rose-600'}>
                                {isGoodDay ? 'VÁ À PRAIA' : 'MELHOR EVITAR'}
                            </span>
                        </div>
                    </div>
                    <div id="verdict-desc-el" className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1 max-w-2xl mx-auto leading-relaxed">
                        {selectedDay.forecast?.condition || 'Sol'} • {Math.round(selectedDay.forecast?.tempMin || 0)}° a {Math.round(selectedDay.forecast?.tempMax || 0)}° • {Math.round(selectedDay.forecast?.windSpeed || 0)}km/h
                    </div>

                    <div className="mt-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 inline-block max-w-4xl mx-auto text-left w-full">
                        <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold uppercase text-[10px] tracking-widest">
                            📘 Dica do Especialista
                        </div>
                        <div id="ai-insight-text" className="analysis-content text-slate-600 leading-relaxed text-sm md:text-base">
                            {citySummary ? renderBoldText(citySummary) : 'Analisando condições...'}
                        </div>
                    </div>
                </div>

                {/* Dados Técnicos */}
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-slate-100">
                    <div id="section-chart">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span className="text-sky-500">📊</span> Tendência (°C / mm / km/h)
                        </h3>
                        <div className="h-[280px]">
                            <WeatherChart hourlyData={chartData} />
                        </div>
                    </div>

                    <div className="flex flex-col" id="section-winds">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span className="text-sky-500">💨</span> Condições de Vento
                        </h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex-grow">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                                    <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Predominante</span>
                                    <span id="wind-dir-display" className="block text-sm font-bold text-slate-800 uppercase">
                                        {windDirToName(selectedForecast.windDir)}
                                    </span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                                    <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Média</span>
                                    <span id="wind-speed-display" className="block text-sm font-bold text-slate-800 uppercase">{Math.round(selectedForecast.windSpeed)} km/h</span>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-3 text-[10px] uppercase tracking-wider flex justify-between items-center">
                                    <span>Principais Abrigos</span>
                                    <span className="text-[9px] bg-sky-50 text-sky-600 px-2 py-1 rounded border border-sky-100 font-bold italic uppercase">Mar: 0.9m</span>
                                </h4>
                                <div id="beach-list" className="flex flex-wrap gap-2">
                                    {["Barra da Lagoa", "Praia do Gravatá", "Prainha da Barra da Lagoa", "Praia do Pântano do Sul", "Ribeirão da Ilha"].map(beach => (
                                        <span key={beach} className="bg-white px-3 py-1.5 rounded-md text-[10px] font-bold text-sky-600 border border-slate-200 shadow-sm uppercase">{beach}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ranking */}
                <div className="p-6 md:p-8 bg-white border-b border-slate-100" id="section-ranking">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🏆</span>
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight text-sm">Ranking de Viabilidade</h3>
                        </div>
                        <button
                            id="btn-expand-ranking"
                            onClick={() => setIsRankingExpanded(!isRankingExpanded)}
                            className="text-[9px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-800 transition-colors bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 shadow-sm"
                        >
                            {isRankingExpanded ? 'Recolher ranking' : 'Ver ranking completo'}
                        </button>
                    </div>

                    <div id="ranking-container" className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {(() => {
                            const allItems = ranking.best || [];
                            const mid = Math.ceil(allItems.length / 2);
                            const leftHalf = allItems.slice(0, mid);
                            const rightHalf = [...allItems.slice(mid)].reverse();

                            const displayedLeft = isRankingExpanded ? leftHalf : leftHalf.slice(0, 5);
                            const displayedRight = isRankingExpanded ? rightHalf : rightHalf.slice(0, 5);

                            return (
                                <>
                                    <div className="bg-emerald-50/40 rounded-2xl p-6 border border-emerald-100 relative" id="best-box">
                                        <h4 className="text-emerald-700 font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                                            <span className="bg-emerald-500 text-white w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px]">✓</span>
                                            Melhores Escolhas
                                        </h4>
                                        <div id="ranking-best" className="space-y-4 relative z-10">
                                            {displayedLeft.map((item) => (
                                                <RankingItem key={item.id} item={item} rank={item.position} isGood={true} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-rose-50/40 rounded-2xl p-6 border border-rose-100 relative" id="worst-box">
                                        <h4 className="text-rose-700 font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                                            <span className="bg-rose-500 text-white w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px]">✕</span>
                                            Melhor evitar
                                        </h4>
                                        <div id="ranking-worst" className="space-y-4 relative z-10">
                                            {displayedRight.map((item) => (
                                                <RankingItem key={item.id} item={item} rank={item.position} isGood={false} />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Consultoria */}
                <div className="p-8 bg-slate-50/40">
                    <div className="max-w-3xl mx-auto text-center md:text-left">
                        <h3 className="text-slate-800 font-bold text-lg mb-1 text-sm uppercase tracking-wider">Consultoria de Praia</h3>
                        <p className="text-slate-500 text-[11px] leading-relaxed mb-4">
                            Esta inteligência artificial analisa em tempo real os dados de vento, balneabilidade oficial do
                            IMA e janelas de chuva para responder dúvidas específicas. O melhor caso de uso é consultar
                            horários precisos (ex: <strong>"Como estará o mar às 16h?"</strong>) ou perfis de passeio (ex:
                            <strong>"Qual a melhor praia para crianças hoje?"</strong>).
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="relative group">
                                <input
                                    id="ai-query"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                                    type="text"
                                    placeholder="Qual praia é melhor hoje às 15h?"
                                    className="w-full bg-white px-5 py-4 rounded-2xl border border-slate-300 focus:border-sky-500 outline-none shadow-sm pr-32 text-sm text-slate-800"
                                />
                                <button
                                    id="btn-ask-ai"
                                    onClick={handleAskAi}
                                    disabled={loadingChat}
                                    className="absolute right-2 top-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 uppercase tracking-widest disabled:opacity-50"
                                >
                                    {loadingChat ? '...' : 'Consultar'}
                                </button>
                            </div>
                            {aiResponse && (
                                <div id="ai-response-container" className="mt-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm text-left">
                                    <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-3 border-b border-slate-100 pb-2">Resposta da Consultoria</span>
                                    <div className="analysis-content text-slate-600 text-sm leading-relaxed">
                                        {renderBoldText(aiResponse)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RankingItem({ item, rank, isGood }: { item: any; rank: number; isGood: boolean }) {
    const status = item.status || "";
    const isMista = status.toUpperCase().includes('MISTA');
    const isSemLaudo = status.toUpperCase().includes('SEM LAUDO');
    const isPropria = status.toUpperCase().includes('PRÓPRIA') && !isMista && !isSemLaudo;

    const statusColor = isPropria ? 'text-emerald-600' : (isSemLaudo || isMista) ? 'text-amber-600' : 'text-rose-600';
    const statusBg = isPropria ? 'bg-emerald-50' : (isSemLaudo || isMista) ? 'bg-amber-50' : 'bg-rose-50';

    return (
        <div className="beach-item flex items-start justify-between border-b border-slate-100 pb-2 last:border-0 pt-1 px-2 rounded-md hover:bg-slate-100/50 transition-all">
            <div className="flex-grow flex flex-col space-y-1.5">
                {/* Linha 1: Rank, Nome e Percentual */}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-[11px] font-bold ${isGood ? 'text-emerald-600' : 'text-rose-600'} min-w-[24px]`}>#{rank}</span>
                        <h5 className="text-[11px] font-bold text-slate-800 uppercase leading-none">{item.beach?.name || 'Praia Desconhecida'}</h5>
                    </div>
                    <span className={`text-[11px] font-black ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>{item.score}%</span>
                </div>

                {/* Linha 2: Badge, Descrição e Barra */}
                <div className="flex items-center gap-2">
                    <span className={`inline-block border text-[9px] font-bold ${statusBg} ${statusColor} px-1 rounded whitespace-nowrap`}>
                        {isMista ? `⚠️ ${item.proprioCount}/${item.totalPoints}` : 
                         isSemLaudo ? '⚠️ SEM LAUDO' : 
                         isPropria ? 'PRÓPRIA' : 'IMPRÓPRIA'}
                    </span>
                    <p className="text-[10px] text-slate-400 leading-tight flex-grow line-clamp-1">
                        {item.beach?.offlineDesc}
                    </p>
                    <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                        <div className={`h-full transition-all duration-1000 ${isGood ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${item.score}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return <div className="p-8 text-center text-slate-400">Carregando painel...</div>;
}

function windDirToName(dir: string) {
    if (!dir) return "";
    const cleanDir = dir.trim().toUpperCase();
    const map: Record<string, string> = {
        // Siglas
        'N': 'Norte', 'S': 'Sul', 'E': 'Leste', 'W': 'Oeste',
        'NE': 'Nordeste', 'SE': 'Sudeste', 'NW': 'Noroeste', 'SW': 'Sudoeste',
        'NNE': 'Norte-Nordeste', 'ENE': 'Leste-Nordeste', 'ESE': 'Leste-Sudeste', 'SSE': 'Sul-Sudeste',
        'SSW': 'Sul-Sudoeste', 'WSW': 'Oeste-Sudoeste', 'WNW': 'Oeste-Noroeste', 'NNW': 'Norte-Noroeste',
        
        // Nomes completos em inglês
        'NORTH': 'Norte', 'SOUTH': 'Sul', 'EAST': 'Leste', 'WEST': 'Oeste',
        'NORTHEAST': 'Nordeste', 'SOUTHEAST': 'Sudeste', 'NORTHWEST': 'Noroeste', 'SOUTHWEST': 'Sudoeste',
        'NORTH_NORTHEAST': 'Norte-Nordeste', 'EAST_NORTHEAST': 'Leste-Nordeste', 
        'EAST_SOUTHEAST': 'Leste-Sudeste', 'SOUTH_SOUTHEAST': 'Sul-Sudeste',
        'SOUTH_SOUTHWEST': 'Sul-Sudoeste', 'WEST_SOUTHWEST': 'Oeste-Sudoeste', 
        'WEST_NORTHWEST': 'Oeste-Noroeste', 'NORTH_NORTHWEST': 'Norte-Noroeste'
    };
    return map[cleanDir] || dir;
}

function renderBoldText(text: string) {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <>
            {parts.map((part, i) => (
                part.startsWith('**') && part.endsWith('**') ?
                    <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong> :
                    part
            ))}
        </>
    );
}
