'use client';
import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineController,
    BarController
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend
);

interface HourlyData {
    time: string;
    temp: number;
    rain: number;
    wind: number;
    condition: string;
    icon: string;
}

export default function WeatherChart({ hourlyData }: { hourlyData: HourlyData[] }) {
    const chartData = {
        labels: hourlyData.map(h => h.time.substring(11, 16).replace(':', 'h')), // "2026-03-11 03:00" -> "03h00"
        datasets: [
            {
                type: 'line' as const,
                label: 'Temperatura (°C)',
                data: hourlyData.map(h => h.temp),
                borderColor: '#f59e0b',
                backgroundColor: '#f59e0b',
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Vento (km/h)',
                data: hourlyData.map(h => h.wind),
                borderColor: '#6366f1',
                backgroundColor: '#6366f1',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3,
                yAxisID: 'y2'
            },
            {
                type: 'bar' as const,
                label: 'Chuva (mm)',
                data: hourlyData.map(h => h.rain),
                backgroundColor: 'rgba(56, 189, 248, 0.5)',
                borderColor: 'rgba(56, 189, 248, 0.8)',
                borderWidth: 1,
                yAxisID: 'y1'
            }
        ]
    };

    // Cálculo de Escalas Dinâmicas
    const maxWindFound = Math.max(...hourlyData.map(h => h.wind), 0);
    const maxRainFound = Math.max(...hourlyData.map(h => h.rain), 0);

    // Definir um teto mínimo para a escala não ficar "colada" no topo e manter legibilidade
    // Para vento, mínimo de 20km/h. Para chuva, mínimo de 5mm.
    const dynamicMaxWind = Math.max(20, Math.ceil(maxWindFound * 1.2));
    const dynamicMaxRain = Math.max(5, Math.ceil(maxRainFound * 1.5));

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                display: true, 
                position: 'top' as const, 
                labels: { 
                    boxWidth: 10, 
                    font: { size: 10, weight: 'bold' as any },
                    padding: 15
                } 
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 12,
                titleFont: { size: 12, weight: 'bold' as any },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (c: any) => {
                        if (c.datasetIndex === 0) return ` Temperatura: ${c.raw}°C`;
                        if (c.datasetIndex === 1) return ` Vento: ${c.raw} km/h`;
                        return ` Chuva: ${c.raw} mm`;
                    }
                }
            }
        },
        scales: {
            y: { 
                position: 'left' as const,
                min: 10, 
                max: 45, 
                grid: { color: '#f1f5f9' },
                ticks: { callback: (v: any) => v + '°', font: { size: 10, weight: 'bold' as any }, color: '#64748b' } 
            },
            y1: { 
                type: 'linear' as const, 
                display: true, 
                position: 'right' as const, 
                min: 0, 
                max: dynamicMaxRain,
                title: { display: true, text: 'Chuva (mm)', font: { size: 8, weight: 'bold' as any } },
                grid: { drawOnChartArea: false },
                ticks: { font: { size: 9 }, color: '#0ea5e9' }
            },
            y2: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                min: 0,
                max: dynamicMaxWind,
                title: { display: true, text: 'Vento (km/h)', font: { size: 8, weight: 'bold' as any } },
                grid: { drawOnChartArea: false },
                ticks: { font: { size: 9 }, color: '#6366f1' }
            }
        }
    };

    return <Chart type="line" data={chartData} options={chartOptions} />;
}
