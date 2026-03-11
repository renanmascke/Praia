'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatWindLocale, formatRegionLocale } from '@/lib/formatters';
import { renderBoldText } from '@/lib/ui-utils';
import WeatherChart from './WeatherChart';

interface BeachData {
    id: string;
    name: string;
    region: string;
    target?: string;
    idealWind: string;
    offlineDesc: string;
    pts: number;
    pPts: number;
    imp: number;
    status: string;
}

interface HourlyData {
    time: string;
    temp: number;
    rain: number;
    wind: number;
    condition: string;
    icon: string;
}

interface ForecastData {
    id: string;
    date: Date;
    condition: string;
    tempMax: number;
    tempMin: number;
    rainChance: number;
    rainAmount: number;
    windDir: string;
    windSpeed: number;
    hourlyData: any; // Prisma Json
}

interface DailyData {
    date: string;
    summary: string | null;
    rankings: any[];
}

export default function DashboardClient({ initialBeaches, initialForecasts, dailyData }: { initialBeaches: BeachData[], initialForecasts: ForecastData[], dailyData: DailyData[] }) {
    const [selectedDayIdx, setSelectedDayIdx] = useState(0);
    const [rankingExpanded, setRankingExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [loadingChat, setLoadingChat] = useState(false);

    // Fallback seguro se não houver previsões
    if (!initialForecasts || initialForecasts.length === 0) {
        return (
            <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800">Sem dados climáticos disponíveis.</h2>
                <p className="text-slate-500 mt-2">O robô de sincronização climática ainda não resgatou a previsão.</p>
            </div>
        );
    }

    const selectedForecast = initialForecasts[selectedDayIdx];
    const hourlyJSON: HourlyData[] = selectedForecast.hourlyData as HourlyData[] || [];
    const currentDaily = dailyData[selectedDayIdx];
    const citySummary = currentDaily?.summary;

    // Cálculos de Veredito Rápido
    const verdictStatus = (selectedForecast.rainAmount > 5 || selectedForecast.windSpeed > 25) ? "MELHOR EVITAR" : "VÁ À PRAIA";
    const theme = (selectedForecast.rainAmount > 5 || selectedForecast.windSpeed > 25) ? "rose" : "emerald";
    const descString = `${selectedForecast.condition} • ${Math.round(selectedForecast.tempMin)}° a ${Math.round(selectedForecast.tempMax)}° • ${Math.round(selectedForecast.windSpeed)}km/h`;

    // Data Legível
    const d = new Date(selectedForecast.date);
    const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace('-feira', '');

    // Rankings - Usar o do Servidor (IA) ou calcular local como fallback
    const ranking = useMemo(() => {
        if (currentDaily?.rankings && currentDaily.rankings.length > 0) {
            const sortedRankings = [...currentDaily.rankings].sort((a, b) => a.position - b.position);
            const half = Math.ceil(sortedRankings.length / 2);
            
            // "Melhor Evitar" (Worst) deve ser da pior para a melhor (score ascendente)
            const bestPart = sortedRankings.slice(0, half).map(r => ({ ...r.beach, score: r.score, globalRank: r.position }));
            const worstPart = sortedRankings.slice(half).map(r => ({ ...r.beach, score: r.score, globalRank: r.position })).sort((a, b) => a.score - b.score);

            return {
                best: bestPart,
                worst: worstPart
            };
        }

        // Fallback calculation (local)
        const dStr = String(selectedForecast.windDir || "NE").toUpperCase();
        const scoredList = initialBeaches.map((p, i) => {
            let weatherScore = 72;
            const r = p.region || "";
            if (dStr.includes('N')) {
                if (r.includes('Exposed')) weatherScore -= 45;
                if (r.includes('Sheltered')) weatherScore += 15;
                if (r.includes('North')) weatherScore -= 20;
            } else if (dStr.includes('S')) {
                if (r.includes('Exposed')) weatherScore -= 55;
                if (r.includes('North')) weatherScore += 20;
                if (r.includes('South')) weatherScore -= 20;
            } else if (dStr.includes('E')) {
                if (r.includes('East')) weatherScore -= 40;
            }
            const swimmabilityFactor = p.pts > 0 ? (p.pPts / p.pts) : 1;
            const swimmabilityScore = swimmabilityFactor * 100;
            let finalScore = (weatherScore * 0.7) + (swimmabilityScore * 0.3);
            if (p.pts > 0 && p.pPts === 0) finalScore = 5 + (i % 5);
            if (finalScore > 98) finalScore = 98;
            if (finalScore < 0) finalScore = 0;
            return { ...p, score: Math.round(finalScore) };
        });
        const sortedAll = scoredList.sort((a, b) => b.score - a.score);
        const rankedAll = sortedAll.map((p, i) => ({ ...p, globalRank: i + 1 }));
        const half = Math.ceil(rankedAll.length / 2);
        
        const bestPart = rankedAll.slice(0, half);
        const worstPart = rankedAll.slice(half).sort((a, b) => a.score - b.score);

        return {
            best: bestPart,
            worst: worstPart
        };
    }, [initialBeaches, selectedForecast, currentDaily]);

    const handleAskAi = async () => {
        if (!query.trim()) return;
        setLoadingChat(true);
        setAiResponse(null);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    context: {
                        cityName: "Florianópolis",
                        weatherData: {
                            condition: selectedForecast.condition,
                            tempMax: selectedForecast.tempMax,
                            tempMin: selectedForecast.tempMin,
                            windDir: selectedForecast.windDir,
                            windSpeed: selectedForecast.windSpeed,
                            hourly: hourlyJSON.slice(0, 24)
                        },
                        topBeaches: ranking.best.map(b => ({ name: b.name, score: b.score }))
                    }
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiResponse(data.response);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingChat(false);
        }
    };

    const windFull = formatWindLocale(selectedForecast.windDir);

    return (
        <div className="overflow-hidden relative text-sm font-sans">

            {/* Seletor de Datas */}
            <section className="mb-10 overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex justify-start md:justify-center min-w-max pb-4 px-4">
                    <div className="inline-flex bg-slate-200/50 backdrop-blur-md rounded-[2rem] p-1.5 border border-slate-200 shadow-sm gap-1.5">
                        {initialForecasts.map((forecast, idx) => {
                            const fd = new Date(forecast.date);
                            const isToday = fd.toDateString() === new Date().toDateString();
                            const label = isToday ? "Hoje" : fd.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
                            const isActive = idx === selectedDayIdx;
                            return (
                                <button
                                    key={forecast.id}
                                    onClick={() => setSelectedDayIdx(idx)}
                                    className={`relative px-6 py-3 rounded-[1.5rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${isActive ? 'bg-white text-sky-600 shadow-xl shadow-sky-100/50 scale-105 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                                    {label}
                                    {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-sky-500 rounded-full"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PAINEL PRINCIPAL */}
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12 relative transition-all duration-500">

                {/* Bloco 1: Veredito & Insight */}
                <div className={`p-8 md:p-12 text-center border-b border-slate-50 relative overflow-hidden ${theme === 'rose' ? 'bg-rose-50/10' : 'bg-emerald-50/10'}`}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
                    
                    <h2 className="relative z-10 text-[10px] sm:text-xs font-black tracking-[0.3em] uppercase mb-4 text-slate-400/80">
                        {dateStr}
                    </h2>

                    <div className="relative z-10 flex flex-col items-center justify-center gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            {hourlyJSON[2]?.icon && (
                                <div className="bg-white p-4 rounded-[2rem] shadow-lg shadow-slate-100 border border-slate-50">
                                    <img src={hourlyJSON[2].icon} alt="icon" className="w-12 h-12 object-contain" />
                                </div>
                            )}
                            <div className="text-center md:text-left">
                                <h3 className={`text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase text-${theme}-600 mb-1`}>
                                    {verdictStatus}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{descString}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3">
                            <div className="px-5 py-2.5 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm flex items-center gap-2 text-slate-700">
                                <span className="text-base">📍</span> {formatRegionLocale(initialBeaches[0]?.region)}
                            </div>
                            <div className="px-5 py-2.5 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm flex items-center gap-2 text-sky-600">
                                <span className="text-base text-sky-400">🌬️</span> {formatWindLocale(selectedForecast.windDir)}
                            </div>
                        </div>
                    </div>

                    {citySummary && (
                        <div className="relative z-10 max-w-4xl mx-auto mt-4 group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className="relative bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm text-left">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-sky-50 rounded-xl">
                                        <span className="text-xl">✨</span>
                                    </div>
                                    <h4 className="text-slate-800 font-black uppercase tracking-widest text-[10px]">Insight do Especialista</h4>
                                </div>
                                <div className="text-slate-600 text-sm md:text-base font-medium leading-[1.8] analysis-content">
                                    {renderBoldText(citySummary)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Dados Técnicos e Gráfico */}
                <div className="p-6 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 border-b border-slate-50 bg-slate-50/30">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 text-sm uppercase tracking-widest">
                            <span className="p-2 bg-sky-100 text-sky-600 rounded-xl">📊</span> Tendência do Dia
                        </h3>
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 h-[300px]">
                            <WeatherChart hourlyData={hourlyJSON} />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 text-sm uppercase tracking-widest">
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">💨</span> Condições de Vento
                        </h3>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 flex-grow">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-sky-200 transition-colors">
                                    <span className="block text-[9px] text-slate-400 uppercase font-black mb-2 tracking-[0.2em]">Predominante</span>
                                    <span className="block text-lg font-black text-slate-800 leading-tight">({selectedForecast.windDir})<br/>{windFull}</span>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:border-sky-200 transition-colors">
                                    <span className="block text-[9px] text-slate-400 uppercase font-black mb-2 tracking-[0.15em]">Vel. Média</span>
                                    <span className="block text-2xl font-black text-slate-800">{Math.round(selectedForecast.windSpeed)} <small className="text-xs uppercase text-slate-400 font-bold ml-1">km/h</small></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ranking List */}
                <div className="p-8 md:p-12 bg-white" id="section-ranking">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-amber-100">🏆</div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ranking de Viabilidade</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Baseado em Vento + Sol + Balneabilidade</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setRankingExpanded(!rankingExpanded)}
                            className="text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-white hover:bg-sky-600 transition-all bg-sky-50 px-6 py-3 rounded-full border border-sky-100 shadow-sm active:scale-95">
                            {rankingExpanded ? 'Ocultar Detalhes' : 'Ver Tudo'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="bg-emerald-50/30 rounded-[3rem] p-8 border border-emerald-100/50">
                            <h4 className="text-emerald-700 font-black text-[11px] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                <span className="bg-emerald-500 text-white w-5 h-5 flex items-center justify-center rounded-lg text-[10px] shadow-lg shadow-emerald-200">✓</span>
                                Melhores Escolhas
                            </h4>
                            <div className="space-y-3">
                                {ranking.best.map((p, i) => (
                                    <RankItem key={p.id} color="emerald" item={p} i={i} rankingExpanded={rankingExpanded} />
                                ))}
                            </div>
                        </div>

                        <div className="bg-rose-50/30 rounded-[3rem] p-8 border border-rose-100/50">
                            <h4 className="text-rose-700 font-black text-[11px] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                <span className="bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-lg text-[10px] shadow-lg shadow-rose-200">✕</span>
                                Evitar se possível
                            </h4>
                            <div className="space-y-3">
                                {ranking.worst.map((p, i) => (
                                    <RankItem key={p.id} color="rose" item={p} i={i} rankingExpanded={rankingExpanded} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Consultoria IA */}
                <div className="p-10 md:p-14 bg-slate-900 text-white border-t border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full -ml-48 -mb-48 blur-[100px]"></div>
                    
                    <div className="max-w-3xl mx-auto relative z-10 text-center md:text-left">
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
                            <span className="text-3xl">💬</span> Consultoria de Praia
                        </h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                            Nossa IA analisa em tempo real os dados de vento, balneabilidade e janelas de chuva para responder suas dúvidas. Tente perguntar sobre horários específicos ou perfis de lazer.
                        </p>
                        
                        <div className="flex flex-col gap-6">
                            <div className="relative group">
                                <input 
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                                    type="text" 
                                    placeholder="Ex: Qual a melhor praia hoje às 15h para crianças?"
                                    className="w-full bg-slate-800/50 border border-slate-700 px-8 py-6 rounded-[2.5rem] focus:border-sky-500 focus:bg-slate-800 outline-none shadow-2xl transition-all text-base text-white placeholder:text-slate-500 pr-40"
                                />
                                <button 
                                    onClick={handleAskAi}
                                    disabled={loadingChat || !query.trim()}
                                    className="absolute right-3 top-3 bottom-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white px-8 rounded-[2rem] font-black text-xs transition-all shadow-xl active:scale-95 uppercase tracking-widest flex items-center gap-2">
                                    {loadingChat ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Consultar'}
                                </button>
                            </div>

                            {aiResponse && (
                                <div className="mt-4 p-8 bg-white text-slate-800 rounded-[2.5rem] shadow-2xl text-left border border-sky-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                        <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200">✨</div>
                                        <div>
                                            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">Resposta da Consultoria</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Baseado em dados em tempo real</span>
                                        </div>
                                    </div>
                                    <div className="text-slate-600 text-base font-medium leading-[1.8] analysis-content">
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

function slugify(text: string) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '-');
}

function RankItem({ item, color, i, rankingExpanded }: { item: any; color: string; i: number; rankingExpanded: boolean; }) {
    const isExtra = i >= 5;
    if (isExtra && !rankingExpanded) return null;

    return (
        <Link 
            href={`/praia/${slugify(item.name)}`} 
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-100 transition-all cursor-pointer group w-full overflow-hidden"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-[10px] ${
                    color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                    #{item.globalRank}
                </div>
                <div className="min-w-0 flex-1">
                    <h5 className="text-[12px] font-black text-slate-800 uppercase truncate group-hover:text-sky-600 transition-colors">
                        {item.name}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{item.offlineDesc}</p>
                </div>
            </div>
            <div className="text-right ml-4 flex-shrink-0 w-16">
                <span className={`text-xs font-black ${color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.score}%</span>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div className={`${color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'} h-full transition-all duration-1000`} style={{ width: `${item.score}%` }}></div>
                </div>
            </div>
        </Link>
    );
}
