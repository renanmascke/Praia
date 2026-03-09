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
        labels: hourlyData.map(h => h.time.substring(0, 5)), // "03:00" -> "03h" if needed, just taking first 5 chars
        datasets: [
            {
                type: 'line' as const,
                label: 'Temperatura (°C)',
                data: hourlyData.map(h => h.temp),
                borderColor: '#f59e0b',
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Vento (km/h)',
                data: hourlyData.map(h => h.wind),
                borderColor: '#0ea5e9',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3,
                yAxisID: 'y2'
            },
            {
                type: 'bar' as const,
                label: 'Chuva (mm)',
                data: hourlyData.map(h => h.rain),
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                yAxisID: 'y1'
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top' as const, labels: { boxWidth: 10, font: { size: 10 } } },
            tooltip: {
                callbacks: {
                    label: (c: any) => {
                        if (c.datasetIndex === 0) return ` Temperatura: ${c.raw}°C`;
                        if (c.datasetIndex === 1) return ` Vento: ${c.raw}km/h`;
                        return ` Chuva: ${c.raw}mm`;
                    }
                }
            }
        },
        scales: {
            y: { min: 10, max: 40, ticks: { callback: (v: any) => v + '°C', font: { size: 9 } } },
            y1: { type: 'linear' as const, display: false, position: 'right' as const, min: 0, max: 50 },
            y2: { type: 'linear' as const, display: false, position: 'right' as const, min: 0, max: 60 }
        }
    };

    return <Chart type="line" data={chartData} options={chartOptions} />;
}
