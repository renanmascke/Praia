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
import { format, subDays, isSameDay, startOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
            provider: 'STORMGLASS',
            label: '🌊 StormGlass (Mar)',
            type: 'Diário',
            limit: 10,
            color: 'bg-blue-500',
            chartColor: '#3b82f6',
            view: 'last30'
        },
        {
            provider: 'WEATHERAPI',
            label: '🌦️ WeatherAPI (Clima)',
            type: 'Mensal',
            limit: 10000000,
            color: 'bg-emerald-500',
            chartColor: '#10b981',
            view: 'calendarMonth'
        }
    ];

    const getChartData = (providerCode: string) => {
        const provider = providers.find(p => p.provider === providerCode);

        // Garantir que "hoje" seja o dia no Brasil, mesmo se o browser tiver fuso diferente
        const now = new Date();
        const brazilStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const today = new Date(brazilStr + 'T00:00:00Z');

        let days: Date[] = [];

        if (provider?.view === 'calendarMonth') {
            // Do dia 01 até hoje
            days = eachDayOfInterval({
                start: startOfMonth(today),
                end: today
            });
        } else {
            // Últimos 30 dias
            days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));
        }

        const data = days.map(date => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayRecord = history?.find(h => {
                const hDate = new Date(h.date);
                const hDateKey = `${hDate.getUTCFullYear()}-${String(hDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hDate.getUTCDate()).padStart(2, '0')}`;
                return h.provider === providerCode && hDateKey === dateKey;
            });
            return dayRecord ? dayRecord.count : 0;
        });

        return {
            labels: days.map(d => format(d, 'dd/MM', { locale: ptBR })),
            datasets: [{
                label: 'Requisições',
                data: data,
                borderColor: provider?.chartColor || '#6366f1',
                backgroundColor: `${provider?.chartColor || '#6366f1'}20`,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            }]
        };
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((p) => {
                    const quota = initialQuotas?.find(q => q.provider === p.provider);
                    const currentCount = p.provider === 'WEATHERAPI' ? weatherMonthlyTotal : (quota?.count || 0);
                    const percentage = Math.min((currentCount / p.limit) * 100, 100);
                    const isLimitReached = currentCount >= p.limit;

                    return (
                        <div
                            key={p.provider}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
                            onClick={() => setSelectedProvider(p.provider)}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                                        {p.label}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cota {p.type}</p>
                                </div>
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${isLimitReached ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {currentCount.toLocaleString()} / {p.limit.toLocaleString()}
                                </span>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200/50">
                                <div
                                    className={`h-full transition-all duration-1000 rounded-full ${p.color} ${isLimitReached ? 'animate-pulse' : ''}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-slate-400 font-medium italic">Clique para ver histórico</p>
                                <p className="text-[10px] font-black text-blue-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Ver Gráfico →</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Gráfico */}
            {selectedProvider && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedProvider(null)}>
                    <div
                        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Analytics em Tempo Real</p>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {providers.find(p => p.provider === selectedProvider)?.label}
                                </h3>
                                <p className="text-slate-400 text-xs font-medium">
                                    Consumo: {providers.find(p => p.provider === selectedProvider)?.view === 'calendarMonth' ? 'Mês Atual (Dia 01 ao Hoje)' : 'Últimos 30 Dias'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedProvider(null)}
                                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold"
                            >
                                ✕
                            </button>
                        </header>

                        <div className="h-[300px] w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <Line
                                data={getChartData(selectedProvider)}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 10, weight: 'bold' } } },
                                        x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
                                    }
                                }}
                            />
                        </div>

                        <footer className="mt-8 flex justify-end">
                            <button
                                onClick={() => setSelectedProvider(null)}
                                className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                            >
                                Fechar Visualização
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
