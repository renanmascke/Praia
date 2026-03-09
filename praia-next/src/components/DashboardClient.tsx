'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatWindLocale, formatRegionLocale } from '@/lib/formatters';
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


export default function DashboardClient({ initialBeaches, initialForecasts }: { initialBeaches: BeachData[], initialForecasts: ForecastData[] }) {
    const [selectedDayIdx, setSelectedDayIdx] = useState(0);
    const [rankingExpanded, setRankingExpanded] = useState(false);
    const [aiInsight, setAiInsight] = useState("Aguardando Análise...");
    const [loadingAi, setLoadingAi] = useState(false);

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

    // Cálculos de Veredito Rápido
    const verdictStatus = (selectedForecast.rainAmount > 5 || selectedForecast.windSpeed > 25) ? "MELHOR EVITAR" : "VÁ À PRAIA";
    const theme = (selectedForecast.rainAmount > 5 || selectedForecast.windSpeed > 25) ? "rose" : "emerald";
    const descString = `${selectedForecast.condition} • ${Math.round(selectedForecast.tempMin)}° a ${Math.round(selectedForecast.tempMax)}° • ${Math.round(selectedForecast.windSpeed)}km/h`;

    // Data Legível
    const d = new Date(selectedForecast.date);
    const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).replace('-feira', '');

    // Calcula Ranking com Base no Dia Selecionado
    const ranking = useMemo(() => {
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
        return {
            best: rankedAll.slice(0, half),
            worst: rankedAll.slice(half).sort((a, b) => (a.score - b.score) || (b.globalRank - a.globalRank))
        };
    }, [initialBeaches, selectedForecast]);

    const windFull = formatWindLocale(selectedForecast.windDir);

    return (
        <div className="overflow-hidden relative text-sm">

            {/* Seletor de Datas */}
            <section className="mb-8 overflow-x-auto no-scrollbar">
                <div className="flex justify-start md:justify-center min-w-max pb-2">
                    <div className="inline-flex bg-slate-200/70 rounded-xl p-1 shadow-inner border border-slate-200 gap-1">
                        {initialForecasts.map((forecast, idx) => {
                            const fd = new Date(forecast.date);
                            const isToday = fd.toDateString() === new Date().toDateString();
                            const label = isToday ? "Hoje" : fd.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
                            const isActive = idx === selectedDayIdx;
                            return (
                                <button
                                    key={forecast.id}
                                    onClick={() => setSelectedDayIdx(idx)}
                                    className={`date-btn px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${isActive ? 'active shadow-sm bg-white text-sky-500' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* PAINEL PRINCIPAL */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative">

                {/* Bloco 1: Veredito */}
                <div className={`p-8 text-center border-b border-slate-100 transition-all duration-700 ${theme === 'rose' ? 'bg-rose-50/20' : 'bg-emerald-50/20'}`}>
                    <h2 className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-2 text-slate-400">
                        {dateStr}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-1 min-h-[40px]">
                        <div className={`text-2xl md:text-3xl font-black tracking-tighter leading-tight uppercase flex items-center gap-2 text-${theme}-600`}>
                            {hourlyJSON[2]?.icon && <img src={hourlyJSON[2].icon} alt="icon" className="w-10 h-10 inline-block align-middle" />}
                            {verdictStatus}
                            <div className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                {formatRegionLocale(initialBeaches[0].region)}
                            </div>
                            <div className="px-2.5 py-1 bg-sky-50 text-sky-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-sky-100" title="Melhor Vento (Terral/Seco) sem marolas">
                                🌬️ {formatWindLocale(initialBeaches[0].idealWind)}
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1 min-h-[16px] max-w-2xl mx-auto leading-relaxed">
                        {descString}
                    </div>
                </div>

                {/* Dados Técnicos e Gráfico */}
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span className="text-sky-500">📊</span> Tendência (°C / mm / km/h)
                        </h3>
                        <div className="chart-container">
                            <WeatherChart hourlyData={hourlyJSON} />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <span className="text-sky-500">💨</span> Condições de Vento
                        </h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex-grow">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                                    <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Predominante</span>
                                    <span className="block text-sm font-bold text-slate-800">({selectedForecast.windDir}) {windFull}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                                    <span className="block text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Vel. Média</span>
                                    <span className="block text-sm font-bold text-slate-800">{Math.round(selectedForecast.windSpeed)} km/h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ranking List */}
                <div className="p-6 md:p-8 bg-white" id="section-ranking">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🏆</span>
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight text-sm">Ranking de Viabilidade</h3>
                        </div>
                        <button
                            onClick={() => setRankingExpanded(!rankingExpanded)}
                            className="text-[9px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-800 transition-colors bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 shadow-sm">
                            {rankingExpanded ? 'Ocultar Ranking' : 'Ver ranking completo'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-emerald-50/40 rounded-2xl p-6 border border-emerald-100">
                            <h4 className="text-emerald-700 font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="bg-emerald-500 text-white w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px]">✓</span>
                                Melhores Escolhas
                            </h4>
                            <div className="space-y-4">
                                {ranking.best.map((p, i) => (
                                    <RankItem key={p.id} color="emerald" item={p} i={i} rankingExpanded={rankingExpanded} />
                                ))}
                            </div>
                        </div>

                        <div className="bg-rose-50/40 rounded-2xl p-6 border border-rose-100">
                            <h4 className="text-rose-700 font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="bg-rose-500 text-white w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px]">✕</span>
                                Melhor evitar
                            </h4>
                            <div className="space-y-4">
                                {ranking.worst.map((p, i) => (
                                    <RankItem key={p.id} color="rose" item={p} i={i} rankingExpanded={rankingExpanded} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}



function slugify(text: string) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '-');
}

function RankItem({ item, color, i, rankingExpanded }: { item: any; color: string; i: number; rankingExpanded: boolean; }) {
    const isExtra = i >= 5;
    if (isExtra && !rankingExpanded) return null;

    return (
        <Link href={`/praia/${slugify(item.name)}`} className="beach-item flex items-start justify-between border-b border-slate-100 pb-2 last:border-0 pt-1 px-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="flex-grow">
                <h5 className="text-[11px] font-bold text-slate-800 uppercase mb-0.5 leading-none group-hover:text-sky-600 transition-colors">
                    <span className={`text-${color}-600 mr-1`}>#{item.globalRank}</span> {item.name}
                </h5>
                <p className="text-[10px] text-slate-400 leading-tight">{item.offlineDesc}</p>
            </div>
            <div className="text-right min-w-[50px] ml-4">
                <span className={`text-[10px] font-black text-${color}-600`}>{item.score}%</span>
                <div className="w-14 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className={`bg-${color}-500 h-full transition-all duration-1000`} style={{ width: `${item.score}%` }}></div>
                </div>
            </div>
        </Link>
    );
}
