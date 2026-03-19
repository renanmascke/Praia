'use client';

import { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    subMonths,
    addDays,
    subDays,
    addWeeks,
    subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/admin/SearchableSelect';
import { renderBoldText } from '@/lib/ui-utils';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    MapPin, 
    Wind, 
    Droplets, 
    Thermometer, 
    Sparkles, 
    Trophy,
    Clock,
    Navigation,
    Layers,
    LayoutGrid,
    LayoutList
} from 'lucide-react';

interface HourlyForecastEntry {
    time: string;
    temp: number;
    windDir: string;
    windSpeed: number;
    waveHeight: number;
    waveDirection: number | null;
    wavePeriod: number | null;
    tideLevel?: number | null;
    conditionText?: string;
    condition?: string;
    icon: string;
}

interface WeatherForecast {
    id: string;
    date: Date | string;
    tempMax: number;
    tempMin: number;
    rainChance: number;
    rainAmount: number;
    windDir: string;
    windSpeed: number;
    icon?: string | null;
    hourlyData: any;
}

interface WindDirection {
    code: string;
    name: string;
    icon: string;
}

export default function WeatherCalendar({
    initialForecasts,
    windDirections,
    anchors,
    currentAnchorId
}: {
    initialForecasts: WeatherForecast[],
    windDirections: WindDirection[],
    anchors: any[],
    currentAnchorId: string
}) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [daySummary, setDaySummary] = useState<string | null>(null);
    const [dayRankings, setDayRankings] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const currentAnchor = anchors.find(a => a.id === currentAnchorId);

    const availableCities = Array.from(new Set(anchors.map(a => JSON.stringify(a.city))))
        .map(s => JSON.parse(s))
        .sort((a, b) => a.name.localeCompare(b.name));

    const cityAnchors = anchors
        .filter(a => a.cityId === currentAnchor?.cityId)
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleCityChange = (cityId: string) => {
        const firstAnchorOfCity = anchors.find(a => a.cityId === cityId);
        if (firstAnchorOfCity) {
            router.push(`/admin/previsao?anchorId=${firstAnchorOfCity.id}`);
        }
    };

    const formatWind = (dirCode?: any) => {
        if (dirCode === undefined || dirCode === null) return { abbr: '--', desc: '--', icon: '' };
        const codeStr = String(dirCode).trim();
        if (codeStr === "") return { abbr: '--', desc: '--', icon: '' };
        const upper = codeStr.toUpperCase();
        const found = windDirections.find(w => w.code === upper);
        
        if (found) {
            // Se for um código longo (estilo Google API), tenta simplificar para a abreviação padrão
            let displayAbbr = found.code;
            if (displayAbbr === 'NORTH_NORTHEAST') displayAbbr = 'NNE';
            else if (displayAbbr === 'NORTH_NORTHWEST') displayAbbr = 'NNW';
            else if (displayAbbr === 'SOUTH_SOUTHEAST') displayAbbr = 'SSE';
            else if (displayAbbr === 'SOUTH_SOUTHWEST') displayAbbr = 'SSW';
            else if (displayAbbr === 'EAST_NORTHEAST') displayAbbr = 'ENE';
            else if (displayAbbr === 'EAST_SOUTHEAST') displayAbbr = 'ESE';
            else if (displayAbbr === 'WEST_SOUTHWEST') displayAbbr = 'WSW';
            else if (displayAbbr === 'WEST_NORTHWEST') displayAbbr = 'WNW';
            else if (displayAbbr === 'NORTH_EAST') displayAbbr = 'NE';
            else if (displayAbbr === 'NORTH_WEST') displayAbbr = 'NW';
            else if (displayAbbr === 'SOUTH_EAST') displayAbbr = 'SE';
            else if (displayAbbr === 'SOUTH_WEST') displayAbbr = 'SW';
            else if (displayAbbr === 'NORTH') displayAbbr = 'N';
            else if (displayAbbr === 'SOUTH') displayAbbr = 'S';
            else if (displayAbbr === 'EAST') displayAbbr = 'E';
            else if (displayAbbr === 'WEST') displayAbbr = 'W';

            return { abbr: displayAbbr, desc: found.name, icon: found.icon };
        }
        return { abbr: upper, desc: upper, icon: '' };
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const nextPeriod = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    const prevPeriod = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1));
    };

    const getForecastForDay = (day: Date) => {
        return initialForecasts.find(f => {
            const fDate = new Date(f.date);
            return fDate.getUTCFullYear() === day.getFullYear() &&
                fDate.getUTCMonth() === day.getMonth() &&
                fDate.getUTCDate() === day.getDate();
        });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setView('month');
    };

    const fetchDayDetails = async (date: Date, cityId: string) => {
        if (!cityId) return;
        setDetailsLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`/api/rankings?cityId=${cityId}&date=${dateStr}`);
            const data = await res.json();
            if (data.success) {
                setDaySummary(data.summary);
                setDayRankings(data.data.slice(0, 3));
            }
        } catch (error) {
            console.error("Erro ao buscar detalhes do dia:", error);
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'day' && currentAnchor?.cityId) {
            fetchDayDetails(currentDate, currentAnchor.cityId);
        }
    }, [view, currentDate, currentAnchor?.cityId]);

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Master Header */}
            <header className="px-8 py-6 border-b border-slate-100 bg-white shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Month/Year Title */}
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                            <CalendarIcon size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-0.5">Calendário Meteorológico</p>
                            <h2 className="text-2xl font-bold text-slate-900 capitalize leading-tight">
                                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                            </h2>
                        </div>
                    </div>

                    {/* Middle Controls: Searchable Selects */}
                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-3xl border border-slate-100 flex-1 max-w-2xl">
                        <div className="flex-1 min-w-[180px]">
                            <SearchableSelect
                                options={availableCities.map(c => ({ id: c.id, name: c.name }))}
                                value={currentAnchor?.cityId || ''}
                                onChange={handleCityChange}
                                placeholder="Filtrar por Cidade..."
                            />
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex-1 min-w-[220px]">
                            <SearchableSelect
                                options={cityAnchors.map(a => ({ id: a.id, name: a.name }))}
                                value={currentAnchorId}
                                onChange={(id) => router.push(`/admin/previsao?anchorId=${id}`)}
                                placeholder="Ponto Geográfico..."
                            />
                        </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner shrink-0">
                            <button
                                onClick={prevPeriod}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                            >
                                <ChevronLeft size={20} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                            >
                                Hoje
                            </button>
                            <button
                                onClick={nextPeriod}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                            >
                                <ChevronRight size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* View Switcher Icons */}
                        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner shrink-0">
                            <button
                                onClick={() => setView('month')}
                                className={`p-2 rounded-xl transition-all ${view === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}
                                title="Mês"
                            >
                                <LayoutGrid size={20} />
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={`p-2 rounded-xl transition-all ${view === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}
                                title="Semana"
                            >
                                <Layers size={20} />
                            </button>
                            <button
                                onClick={() => setView('day')}
                                className={`p-2 rounded-xl transition-all ${view === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}
                                title="Dia"
                            >
                                <LayoutList size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Week Days Header */}
            {view !== 'day' && (
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/20 px-4">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* MONTH VIEW */}
                {view === 'month' && (
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {calendarDays.map((day) => {
                            const forecast = getForecastForDay(day);
                            const isOutside = !isSameMonth(day, monthStart);
                            const isTodayDay = isToday(day);

                            // Extracting forecast data safely
                            const arr = forecast ? (Array.isArray(forecast.hourlyData) ? forecast.hourlyData :
                                (typeof forecast.hourlyData === 'object' ? Object.values(forecast.hourlyData as any)[0] : []) as HourlyForecastEntry[]) : [];
                            const midday = arr.find((h: any) => h.time?.includes('12:00')) || arr[0];
                            const wInfo = forecast ? formatWind(midday?.windDir) : null;
                            const displayIcon = forecast?.icon || midday?.icon;

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => forecast && (setCurrentDate(day), setView('day'))}
                                    className={`min-h-[140px] p-5 border-r border-b border-slate-100 transition-all flex flex-col justify-between group relative ${isOutside ? 'bg-slate-50/40 opacity-30 select-none' : 'bg-white'} ${forecast ? 'cursor-pointer hover:bg-blue-50/20' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-bold w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isTodayDay ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' :
                                            isOutside ? 'text-slate-300' : 'text-slate-500 bg-slate-50'
                                            }`}>
                                            {format(day, 'd')}
                                        </span>
                                        {forecast && (
                                            <div className="flex flex-col items-end gap-1">
                                                {displayIcon && <img src={displayIcon} className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-125 transition-transform duration-500" alt="weather" />}
                                            </div>
                                        )}
                                    </div>

                                    {forecast ? (
                                        <div className="space-y-3 mt-4">
                                            <div className="flex items-center justify-center gap-4 bg-slate-50/50 py-1.5 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                                    {Math.round(forecast.tempMin)}°
                                                </div>
                                                <div className="h-2 w-px bg-slate-200"></div>
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                                    {Math.round(forecast.tempMax)}°
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <Wind size={10} className="text-blue-400" />
                                                    <span className="text-[10px] font-bold text-slate-500 truncate">{wInfo?.abbr || '--'} • {Math.round(forecast.windSpeed)}km/h</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Droplets size={10} className="text-blue-500" />
                                                    <span className="text-[10px] font-bold text-blue-600">{forecast.rainChance}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* WEEK VIEW */}
                {view === 'week' && (
                    <div className="grid grid-cols-7 h-full auto-rows-fr">
                        {weekDays.map((day) => {
                            const forecast = getForecastForDay(day);
                            const isTodayDay = isToday(day);
                            const arr = forecast ? (Array.isArray(forecast.hourlyData) ? forecast.hourlyData :
                                (typeof forecast.hourlyData === 'object' ? Object.values(forecast.hourlyData as any)[0] : []) as HourlyForecastEntry[]) : [];

                            const periods = [
                                { label: 'Manhã', time: '09:00', icon: <Sparkles size={12} /> },
                                { label: 'Tarde', time: '15:00', icon: <Navigation size={12} /> },
                                { label: 'Noite', time: '21:00', icon: <Clock size={12} /> }
                            ];

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => forecast && (setCurrentDate(day), setView('day'))}
                                    className={`p-6 border-r border-slate-100 h-full flex flex-col gap-6 cursor-pointer transition-all hover:bg-slate-50/50 ${isTodayDay ? 'bg-blue-50/20' : 'bg-white'}`}
                                >
                                    <div className="text-center space-y-2">
                                        <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-2xl text-xl font-bold transition-all ${isTodayDay ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                                            {format(day, 'd')}
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{format(day, 'EEEE', { locale: ptBR })}</p>
                                    </div>

                                    {forecast ? (
                                        <div className="space-y-4 flex-1">
                                            {periods.map(p => {
                                                const hData = arr.find((h: any) => h.time?.includes(p.time)) || arr[0];
                                                const wInfo = formatWind(hData?.windDir);
                                                return (
                                                    <div key={p.label} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm group hover:border-blue-400 transition-all">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                                                                {p.icon} {p.label}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900">{hData?.temp}°</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            {hData?.icon && <img src={hData.icon} className="w-10 h-10 object-contain drop-shadow-sm" alt="period" />}
                                                            <div className="text-right">
                                                                <div className="text-[10px] font-bold text-blue-500 uppercase flex items-center justify-end gap-1">
                                                                    {wInfo.icon} {wInfo.abbr}
                                                                </div>
                                                                <div className="text-[9px] font-bold text-slate-400">
                                                                    {Math.round(hData?.windSpeed || 0)}km/h
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div className="mt-auto pt-6 border-t border-slate-100 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extremos</span>
                                                    <span className="text-xs font-bold text-slate-700">{Math.round(forecast.tempMin)}° / {Math.round(forecast.tempMax)}°</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chuva</span>
                                                    <span className="text-xs font-bold text-blue-600">{forecast.rainChance}% ({forecast.rainAmount}mm)</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center italic text-[11px] text-slate-300 uppercase font-bold tracking-widest text-center">
                                            Dados Indisponíveis
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* DAILY DASHBOARD VIEW */}
                {view === 'day' && (() => {
                    const forecast = getForecastForDay(currentDate);
                    const arr = forecast ? (Array.isArray(forecast.hourlyData) ? forecast.hourlyData :
                        (typeof forecast.hourlyData === 'object' ? Object.values(forecast.hourlyData as any)[0] : []) as HourlyForecastEntry[]) : [];

                    return (
                        <div className="flex flex-col h-full bg-slate-50/20 p-8 lg:p-10 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            
                            {forecast ? (
                                <>
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200 border border-blue-500/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                                            <div className="relative flex items-center gap-8">
                                                <div className="bg-white/20 backdrop-blur-md p-5 rounded-3xl border border-white/30 group-hover:scale-110 transition-transform duration-700">
                                                    {forecast.icon && <img src={forecast.icon} className="w-24 h-24 object-contain filter drop-shadow-lg" alt="main" />}
                                                </div>
                                                <div>
                                                    <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                                                        {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                                    </p>
                                                    <h3 className="text-6xl font-black tracking-tighter">
                                                        {Math.round(forecast.tempMax)}°<span className="text-3xl font-light opacity-50 ml-1">/ {Math.round(forecast.tempMin)}°</span>
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-4 text-white/80 font-bold uppercase text-[10px] tracking-widest">
                                                        <MapPin size={14} className="text-blue-200" /> {currentAnchor?.city?.name} - {currentAnchor?.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between group">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Precipitação</p>
                                                    <h4 className="text-3xl font-black text-blue-600 tracking-tight">{forecast.rainChance}%</h4>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                    <Droplets size={24} />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                                    <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full transition-all duration-1000" style={{ width: `${forecast.rainChance}%` }}></div>
                                                </div>
                                                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                                    <span>Acumulado:</span>
                                                    <span>{forecast.rainAmount}mm</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between group">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Dinâmica de Vento</p>
                                                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{formatWind(forecast.windDir).abbr}</h4>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                    <Wind size={24} />
                                                </div>
                                            </div>
                                            <div className="space-y-1 pt-4 border-t border-slate-50">
                                                <p className="text-xs font-bold text-slate-600 capitalize">{formatWind(forecast.windDir).desc}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{Math.round(forecast.windSpeed)} km/h <span className="text-slate-200 ml-1">|</span> <span className="ml-1">Principais rajadas ao meio dia.</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analysis & Top Beaches */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                                            <div className="relative flex gap-6 items-start">
                                                <div className="bg-blue-50 p-4 rounded-3xl text-blue-600 border border-blue-100">
                                                    <Sparkles size={28} />
                                                </div>
                                                <div className="space-y-3 flex-1">
                                                    <h4 className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Curadoria de Recomendação</h4>
                                                    {detailsLoading ? (
                                                        <div className="space-y-2 py-2">
                                                            <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-full"></div>
                                                            <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-5/6"></div>
                                                            <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-4/6"></div>
                                                        </div>
                                                    ) : daySummary ? (
                                                        <div className="text-slate-700 text-lg font-medium leading-relaxed max-w-2xl">
                                                            {renderBoldText(daySummary)}
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-400 text-sm italic">Dados analíticos em processo de síntese...</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                                            <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                                <Trophy size={18} className="text-amber-500" /> Estrelas do Dia
                                            </h4>
                                            <div className="space-y-4">
                                                {detailsLoading ? (
                                                    [1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-2xl"></div>)
                                                ) : dayRankings.length > 0 ? (
                                                    dayRankings.map((rk, idx) => (
                                                        <div key={rk.id} className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 group">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                                                                idx === 0 ? 'bg-amber-100 text-amber-600 shadow-inner' :
                                                                idx === 1 ? 'bg-slate-200 text-slate-500' : 'bg-orange-50 text-orange-600'
                                                            }`}>
                                                                #{idx + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 truncate uppercase mt-0.5">{rk.beach.name}</p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                                                        <div className="bg-blue-500 h-full" style={{ width: `${rk.score}%` }}></div>
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-slate-400">{rk.score}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-slate-400 text-[11px] italic text-center py-10">Classificação offline.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hourly Table */}
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[500px]">
                                        <div className="px-8 py-6 border-b border-slate-50 bg-white flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Clock size={16} className="text-blue-600" /> Fluxo Horário Detalhado
                                            </h4>
                                        </div>
                                        <div className="overflow-auto custom-scrollbar flex-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                                        <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tempo</th>
                                                        <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Atmosfera</th>
                                                        <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vento (km/h)</th>
                                                        <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Marés/Ondas</th>
                                                        <th className="p-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Termômetro</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {arr.map((h: any, idx) => {
                                                        const timeDisplay = h.time ? (h.time.includes(' ') ? h.time.split(' ')[1] : h.time) : '--:--';
                                                        const wInfo = formatWind(h.windDir);

                                                        return (
                                                            <tr key={idx} className="hover:bg-blue-50/20 transition-all group">
                                                                <td className="p-5 px-8">
                                                                    <div className="font-bold text-slate-900 text-sm bg-slate-50 px-4 py-2 rounded-xl inline-block border border-slate-100 group-hover:bg-white group-hover:border-blue-200 transition-all">
                                                                        {timeDisplay.includes('T') ? timeDisplay.split('T')[1].substring(0, 5) : timeDisplay}
                                                                    </div>
                                                                </td>
                                                                <td className="p-5 px-8">
                                                                    <div className="flex items-center gap-4">
                                                                        {h.icon && <img src={h.icon} alt="icon" className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-110 transition-all" />}
                                                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                                                            {h.conditionText || h.condition || '--'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5 px-8">
                                                                    <div className="flex flex-col">
                                                                        <div className="text-sm font-bold text-slate-900">{h.windSpeed ?? h.wind ?? '--'} <span className="text-[10px] text-slate-400 font-medium">KM/H</span></div>
                                                                        <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                                                            {wInfo.icon} {wInfo.abbr} <span className="text-slate-300">/</span> {wInfo.desc}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5 px-8">
                                                                    <div className="flex flex-col">
                                                                        <div className="text-sm font-bold text-slate-900">
                                                                            {h.tideLevel !== undefined && h.tideLevel !== null ? `${h.tideLevel.toFixed(2)}m` : '--'}
                                                                            <span className="text-[9px] text-slate-400 ml-1">(Maré)</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">
                                                                            {h.waveHeight ? `${h.waveHeight.toFixed(1)}m` : '--'}
                                                                            {h.waveDirection !== undefined && h.waveDirection !== null && ` | ${h.waveDirection}°`}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5 px-8">
                                                                    <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 font-bold text-sm px-4 py-2 rounded-2xl border border-rose-100">
                                                                        <Thermometer size={14} />
                                                                        {h.temp}°C
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100">
                                        <Layers size={48} className="text-slate-200" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Dataset Indisponível</h3>
                                    <p className="text-slate-500 mt-2 max-w-sm font-medium">A base de dados meteorológicos para este ponto em particular ainda não foi populada para esta data.</p>
                                    <button
                                        onClick={() => setView('month')}
                                        className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
                                    >
                                        Retornar ao Calendário
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
