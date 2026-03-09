'use client';

import { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO,
    startOfDay,
    endOfDay,
    addDays,
    subDays,
    addWeeks,
    subWeeks,
    isSameWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/admin/SearchableSelect';

interface HourlyForecastEntry {
    time: string;
    temp: number;
    windDir: string;
    windSpeed: number;
    waveHeight: number;
    waveDir: string | null;
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
    const [selectedDay, setSelectedDay] = useState<WeatherForecast | null>(null);

    const currentAnchor = anchors.find(a => a.id === currentAnchorId);

    // Derivar lista de cidades únicas das âncoras disponíveis
    const availableCities = Array.from(new Set(anchors.map(a => JSON.stringify(a.city))))
        .map(s => JSON.parse(s))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Âncoras da cidade selecionada
    const cityAnchors = anchors
        .filter(a => a.cityId === currentAnchor?.cityId)
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleCityChange = (cityId: string) => {
        const firstAnchorOfCity = anchors.find(a => a.cityId === cityId);
        if (firstAnchorOfCity) {
            router.push(`/admin/previsao?anchorId=${firstAnchorOfCity.id}`);
        }
    };

    const formatWind = (dirCode?: string | null) => {
        if (!dirCode || dirCode.trim() === "") return { abbr: '--', desc: '--', icon: '' };
        const upper = dirCode.toUpperCase().trim();
        const found = windDirections.find(w => w.code === upper);
        if (found) return { abbr: found.code, desc: found.name, icon: found.icon };
        return { abbr: upper, desc: upper, icon: '' }; // Fallback
    };

    // Gerar dias do calendário
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

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
            // Comparação ignorando fuso horário para garantir que o dia no calendário 
            // bata com a data salva no banco (YYYY-MM-DD)
            return fDate.getUTCFullYear() === day.getFullYear() &&
                fDate.getUTCMonth() === day.getMonth() &&
                fDate.getUTCDate() === day.getDate();
        });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setView('month');
    };

    const cityOptions = availableCities.map(c => ({ id: c.id, name: c.name }));
    const selectedCity = currentAnchor?.cityId || '';
    const anchorOptions = cityAnchors.map(a => ({ id: a.id, name: a.name }));
    const selectedAnchor = currentAnchorId;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden h-full flex flex-col">
            {/* Header / Subheader */}
            <div className="p-6 border-b border-slate-100 bg-white/50 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Navegação Mensal</span>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-baseline gap-2">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <div className="flex flex-col px-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cidade</span>
                            <div className="w-[180px]">
                                <SearchableSelect
                                    options={cityOptions}
                                    value={selectedCity}
                                    onChange={handleCityChange}
                                    placeholder="Cidade..."
                                />
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex flex-col px-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Região / Ponto</span>
                            <div className="w-[220px]">
                                <SearchableSelect
                                    options={anchorOptions}
                                    value={selectedAnchor}
                                    onChange={(id) => router.push(`/admin/previsao?anchorId=${id}`)}
                                    placeholder="Selecione o ponto..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Switcher Moved Here */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                        <button
                            onClick={() => setView('month')}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'month'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-blue-600'
                                }`}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => setView('week')}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'week'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-blue-600'
                                }`}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setView('day')}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'day'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-blue-600'
                                }`}
                        >
                            Dia
                        </button>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <button
                            onClick={prevPeriod}
                            className="p-2.5 px-3 hover:bg-white text-slate-400 hover:text-blue-600 transition-all border-r border-slate-200"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-white transition-all border-r border-slate-200"
                        >
                            Hoje
                        </button>
                        <button
                            onClick={nextPeriod}
                            className="p-2.5 px-3 hover:bg-white text-slate-400 hover:text-blue-600 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Week Days Header - Solo en Mês y Semana */}
            {view !== 'day' && (
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>
            )}

            {/* Dynamic Content based on View */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {view === 'month' && (
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {calendarDays.map((day, i) => {
                            const forecast = getForecastForDay(day);
                            const isOutside = !isSameMonth(day, monthStart);
                            const isCurrentDay = isToday(day);

                            let dayIcon = null;
                            let dayWindCode = null;
                            if (forecast) {
                                const arr = Array.isArray(forecast.hourlyData) ? forecast.hourlyData :
                                    (typeof forecast.hourlyData === 'object' ? Object.values(forecast.hourlyData as any)[0] : []) as HourlyForecastEntry[];
                                const midday = (arr as any[]).find((h: any) => h.time?.includes('12:00')) || (arr as any[])[0];
                                dayIcon = midday?.icon;
                                dayWindCode = midday?.windDir;
                            }
                            const dayWindInfo = forecast ? formatWind(dayWindCode) : null;

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => {
                                        if (forecast) {
                                            setCurrentDate(day);
                                            setView('day');
                                        }
                                    }}
                                    className={`min-h-[120px] p-4 border-r border-b border-slate-100 transition-all relative group flex flex-col justify-between overflow-hidden ${isOutside ? 'bg-slate-50/50 opacity-40' : 'bg-white'} ${forecast ? 'cursor-pointer hover:bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isCurrentDay ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' :
                                            isOutside ? 'text-slate-300' : 'text-slate-500 bg-slate-50/50'
                                            }`}>
                                            {format(day, 'd')}
                                        </span>
                                        {forecast && (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    {dayWindInfo && dayWindInfo.abbr !== '--' && (
                                                        <div className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500" title="Direção do Vento">
                                                            {dayWindInfo.abbr} <span className="text-[10px]">{dayWindInfo.icon}</span>
                                                        </div>
                                                    )}
                                                    {dayIcon ? (
                                                        <img src={dayIcon} className="w-10 h-10 object-contain drop-shadow-sm" alt="previsao" />
                                                    ) : (
                                                        <div className="w-10 h-10 flex items-center justify-center text-xl">🌤️</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {forecast && (
                                        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 mb-0.5 z-10 w-full pointer-events-none transition-opacity">
                                            <div className="flex items-center justify-center gap-4 mb-2 w-full">
                                                <div className="flex items-center gap-1 text-sm font-black text-slate-400" title="Mínima">
                                                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                    {Math.round(forecast.tempMin)}°
                                                </div>
                                                <div className="flex items-center gap-1 text-sm font-black text-slate-600" title="Máxima">
                                                    <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                                    {Math.round(forecast.tempMax)}°
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-2 text-[10px] font-extrabold text-slate-400 w-full bg-slate-50/50 py-1.5 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-1" title="Chuva (Chance / Volume)">
                                                    <span className="text-blue-400">💧</span> {forecast.rainChance}% <span className="opacity-50">/</span> {forecast.rainAmount}mm
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {view === 'week' && (
                    <div className="grid grid-cols-7 h-full auto-rows-fr">
                        {weekDays.map((day, i) => {
                            const forecast = getForecastForDay(day);
                            const isCurrentDay = isToday(day);

                            const arr = forecast ? (Array.isArray(forecast.hourlyData) ? forecast.hourlyData :
                                (typeof forecast.hourlyData === 'object' ? Object.values(forecast.hourlyData as any)[0] : []) as HourlyForecastEntry[]) : [];

                            const periods = [
                                { label: 'Manhã', time: '09:00', icon: '🌅' },
                                { label: 'Tarde', time: '15:00', icon: '☀️' },
                                { label: 'Noite', time: '21:00', icon: '🌙' }
                            ];

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => {
                                        setCurrentDate(day);
                                        setView('day');
                                    }}
                                    className={`p-4 border-r border-slate-100 h-full flex flex-col gap-4 cursor-pointer transition-all hover:bg-slate-50/50 ${isCurrentDay ? 'bg-blue-50/10' : 'bg-white'}`}
                                >
                                    <div className="flex flex-col items-center gap-1 border-b border-slate-50 pb-3">
                                        <span className={`text-xl font-black w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isCurrentDay ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-500'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{format(day, 'EEEE', { locale: ptBR })}</span>
                                    </div>

                                    {forecast ? (
                                        <div className="space-y-4 flex-1">
                                            {periods.map(p => {
                                                const hData = arr.find((h: any) => h.time?.includes(p.time)) || arr[0];
                                                const wInfo = formatWind(hData?.windDir);
                                                return (
                                                    <div key={p.label} className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 group">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 italic">
                                                                {p.icon} {p.label}
                                                            </span>
                                                            <span className="text-xs font-black text-rose-500">{hData?.temp}°</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-1">
                                                            {hData?.icon && <img src={hData.icon} className="w-8 h-8 object-contain" alt="period" />}
                                                            <div className="text-right">
                                                                <div className="text-[9px] font-black text-slate-500 uppercase flex items-center justify-end gap-1">
                                                                    {wInfo.icon} {wInfo.abbr}
                                                                </div>
                                                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[60px]">
                                                                    {Math.round(hData?.windSpeed || 0)}km/h
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <div className="mt-auto pt-4 border-t border-slate-50">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 mb-2">
                                                    <span>Min/Max</span>
                                                    <span className="text-slate-600">{Math.round(forecast.tempMin)}° / {Math.round(forecast.tempMax)}°</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                                    <span>Chuva</span>
                                                    <span className="text-blue-500">{forecast.rainChance}% / {forecast.rainAmount}mm</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center italic text-[10px] text-slate-300 uppercase font-black tracking-widest text-center px-4">
                                            Sem dados
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {view === 'day' && (() => {
                    const forecast = getForecastForDay(currentDate);
                    const arr = forecast ? (Array.isArray(forecast.hourlyData) ? forecast.hourlyData :
                        (typeof forecast.hourlyData === 'object' ? Object.values(forecast.hourlyData as any)[0] : []) as HourlyForecastEntry[]) : [];

                    return (
                        <div className="flex flex-col h-full bg-slate-50/30 p-8 pt-6">
                            {forecast ? (
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 col-span-2">
                                            <div className="bg-blue-50 p-3 rounded-2xl">
                                                {arr[12]?.icon ? (
                                                    <img src={arr[12].icon} className="w-16 h-16 object-contain drop-shadow-md" alt="main" />
                                                ) : <span className="text-5xl">🌤️</span>}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-black bg-blue-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                                                        {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                                                    {Math.round(forecast.tempMax)}°C <span className="text-slate-300 font-light text-xl">/ {Math.round(forecast.tempMin)}°</span>
                                                </h3>
                                                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-0.5">
                                                    📍 {currentAnchor?.city?.name} - {currentAnchor?.name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center gap-1.5">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chance de Chuva</span>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-blue-500">{forecast.rainChance}%</span>
                                                <span className="text-[10px] font-bold text-slate-300 mb-1">Vol: {forecast.rainAmount}mm</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full transition-all" style={{ width: `${forecast.rainChance}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center text-slate-800">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vento Predominante</span>
                                            {(() => {
                                                const wInfo = formatWind(forecast.windDir);
                                                return (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-3xl">{wInfo.icon}</span>
                                                        <div>
                                                            <div className="text-lg font-black">{wInfo.abbr}</div>
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">{wInfo.desc}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
                                        <div className="p-6 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                <span className="text-blue-500">⏱️</span> Detalhamento Horário
                                            </h4>
                                        </div>
                                        <div className="overflow-auto custom-scrollbar flex-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-white z-10">
                                                    <tr className="border-b border-slate-100">
                                                        <th className="p-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Hora</th>
                                                        <th className="p-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Condição</th>
                                                        <th className="p-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Ventos</th>
                                                        <th className="p-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Mar</th>
                                                        <th className="p-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Temp</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {arr.map((h: any, idx) => {
                                                        const timeDisplay = h.time ? (h.time.includes(' ') ? h.time.split(' ')[1] : h.time) : '--:--';
                                                        const windSpeed = h.windSpeed ?? h.wind ?? '--';
                                                        const wInfo = formatWind(h.windDir);

                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                                <td className="p-4 px-8">
                                                                    <div className="font-black text-slate-700 text-xs bg-slate-100 px-3 py-1.5 rounded-lg inline-block border border-slate-200/50">
                                                                        {timeDisplay}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 px-8">
                                                                    <div className="flex items-center gap-3">
                                                                        {h.icon && <img src={h.icon} alt="icon" className="w-8 h-8 object-contain" />}
                                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                                                                            {h.conditionText || h.condition || '--'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 px-8">
                                                                    <div className="flex flex-col">
                                                                        <div className="text-xs font-black text-slate-700">{windSpeed} <span className="text-[10px] text-slate-400 font-bold uppercase">km/h</span></div>
                                                                        <div className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-0.5 flex items-center gap-1 italic">
                                                                            {wInfo.icon} {wInfo.abbr} - {wInfo.desc}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 px-8">
                                                                    <div className="flex flex-col">
                                                                        <div className="text-xs font-black text-slate-700">{h.waveHeight ? `${h.waveHeight}m` : '--'}</div>
                                                                        <div className="text-[9px] text-teal-500 font-black uppercase tracking-widest mt-0.5 italic">{h.waveDir || '--'}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 px-8">
                                                                    <div className="inline-flex items-center justify-center bg-rose-50 text-rose-600 font-black text-sm px-3 py-1.5 rounded-xl border border-rose-100">
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
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in zoom-in-95 duration-700">
                                    <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner">⛈️</div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Sem Dados</h3>
                                    <button
                                        onClick={() => setView('month')}
                                        className="mt-8 px-8 py-3 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all shadow-xl"
                                    >
                                        Voltar ao Mês
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
