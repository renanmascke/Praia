'use client';

import { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { subDays, startOfMonth, eachDayOfInterval } from 'date-fns';
import { 
    Activity, 
    Waves, 
    ArrowUpRight,
    BarChart3,
    Clock,
    Zap,
    CloudRain,
    X
} from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Quota {
    provider: string;
    count: number;
    maxLimit: number;
}

interface ApiQuotaDisplayProps {
    initialQuotas: Quota[];
    history: any[];
    weatherMonthlyTotal: number;
}

export default function ApiQuotaDisplay({ initialQuotas, history, weatherMonthlyTotal }: ApiQuotaDisplayProps) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    const providers = [
        {
            provider: 'TABUA_MARE',
            label: 'Tábua de Marés (devtu)',
            icon: <Waves size={20} />,
            type: 'Diário',
            limit: 1000,
            color: 'bg-blue-500',
            chartColor: '#3b82f6',
            view: 'last30',
            description: 'Níveis oficiais de maré alta e baixa do litoral brasileiro.'
        },
        {
            provider: 'OPEN_METEO',
            label: 'Open-Meteo Marine',
            icon: <Activity size={20} />,
            type: 'Diário',
            limit: 10000,
            color: 'bg-sky-600',
            chartColor: '#0284c7',
            view: 'last30',
            description: 'Dados horários de altura, direção e período das ondas.'
        },
        {
            provider: 'GOOGLE_WEATHER',
            label: 'Google Cloud Weather',
            icon: <CloudRain size={20} />,
            type: 'Mensal',
            limit: 10000,
            color: 'bg-emerald-600',
            chartColor: '#059669',
            view: 'calendarMonth',
            description: 'Previsão hiperlocal de clima, vento e chuva utilizando IA do Google.'
        }
    ];

    const getChartData = (providerCode: string) => {
        const provider = providers.find(p => p.provider === providerCode);
        const now = new Date();
        const brazilStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const today = new Date(brazilStr + 'T00:00:00Z');

        let days: Date[] = [];
        if (provider?.view === 'calendarMonth') {
            days = eachDayOfInterval({
                start: startOfMonth(today),
                end: today
            });
        } else {
            days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));
        }

        const data = days.map(date => {
            const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            const dayRecord = history?.find(h => {
                const hDate = new Date(h.date);
                const hDateKey = `${hDate.getUTCFullYear()}-${String(hDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hDate.getUTCDate()).padStart(2, '0')}`;
                return h.provider === providerCode && hDateKey === dateKey;
            });
            return dayRecord ? dayRecord.count : 0;
        });

        return {
            labels: days.map(d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`),
            datasets: [{
                label: 'Requisições',
                data: data,
                borderColor: provider?.chartColor || '#6366f1',
                backgroundColor: `${provider?.chartColor || '#6366f1'}15`,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 3,
            }]
        };
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {providers.map((p) => {
                    const quota = initialQuotas?.find(q => q.provider === p.provider);
                    const currentCount = p.provider === 'GOOGLE_WEATHER' ? weatherMonthlyTotal : (quota?.count || 0);
                    const percentage = Math.min((currentCount / p.limit) * 100, 100);
                    const isLimitReached = currentCount >= p.limit;
                    const isWarning = percentage > 80;

                    return (
                        <div
                            key={p.provider}
                            className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl hover:shadow-2xl hover:border-emerald-400 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                            onClick={() => setSelectedProvider(p.provider)}
                        >
                            <div className="absolute -top-4 -right-4 w-32 h-32 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${p.color}`}>
                                            {p.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 tracking-tight">{p.label}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Janela {p.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black shadow-inner border transition-all ${
                                            isLimitReached ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                            isWarning ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-slate-50 text-slate-600 border-slate-100'
                                        }`}>
                                            {currentCount.toLocaleString()} <span className="text-slate-300 mx-1.5">/</span> {p.limit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-50 relative">
                                        <div
                                            className={`h-full transition-all duration-1000 rounded-full ${p.color} ${isLimitReached ? 'animate-pulse' : ''}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-slate-400">Taxa de Ocupação</span>
                                        <span className={`${isLimitReached ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-blue-600'}`}>{percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex justify-between items-center pt-4 border-t border-slate-50">
                                <p className="text-[10px] text-slate-500 font-medium italic">
                                    {p.description}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-tighter group-hover:translate-x-1 transition-all">
                                    Gerenciar Cota <ArrowUpRight size={14} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Analysis Modal */}
            {selectedProvider && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProvider(null)} />
                    <div
                        className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white animate-in zoom-in-95 duration-200 relative z-10"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${providers.find(p => p.provider === selectedProvider)?.color}`}>
                                    <BarChart3 size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                                        {providers.find(p => p.provider === selectedProvider)?.label}
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={12} className="text-blue-500" />
                                        Métrica: {providers.find(p => p.provider === selectedProvider)?.view === 'calendarMonth' ? 'Mensal' : '30 Dias'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedProvider(null)}
                                className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </header>

                        <div className="p-10 space-y-8">
                            <div className="h-[350px] w-full bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                                <Line
                                    data={getChartData(selectedProvider)}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { 
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: '#0f172a',
                                                titleFont: { size: 12, weight: 'bold' },
                                                bodyFont: { size: 12 },
                                                padding: 12,
                                                cornerRadius: 12,
                                                displayColors: false
                                            }
                                        },
                                        scales: {
                                            y: { 
                                                beginAtZero: true, 
                                                grid: { color: '#f1f5f9' }, 
                                                ticks: { 
                                                    font: { size: 11, weight: 'bold' },
                                                    color: '#94a3b8'
                                                } 
                                            },
                                            x: { 
                                                grid: { display: false }, 
                                                ticks: { 
                                                    font: { size: 11, weight: 'bold' },
                                                    color: '#94a3b8'
                                                } 
                                            }
                                        }
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Serviço</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <span className="font-bold text-slate-800">Ativo / Google Maps</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média de Performance</p>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-blue-500" />
                                        <span className="font-bold text-slate-800">High Speed</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Último Handshake</p>
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-amber-500" />
                                        <span className="font-bold text-slate-800">Recente</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <footer className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                            <button
                                onClick={() => setSelectedProvider(null)}
                                className="w-full md:w-auto px-12 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                            >
                                Fechar Monitoramento
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
