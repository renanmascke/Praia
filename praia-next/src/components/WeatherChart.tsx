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
}

export default function WeatherChart({ hourlyData }: { hourlyData: HourlyData[] }) {
    const labels = hourlyData.map(h => h.time.substring(11, 13) + 'h');

    const data = {
        labels,
        datasets: [
            {
                type: 'line' as const,
                label: 'Temperatura (°C)',
                data: hourlyData.map(h => h.temp),
                borderColor: '#F59E0B', // Amber 500 (Orange na referência)
                backgroundColor: '#F59E0B',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#F59E0B',
                tension: 0,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Vento (km/h)',
                data: hourlyData.map(h => h.wind),
                borderColor: '#0EA5E9', // Sky 500
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 3,
                pointBackgroundColor: '#0EA5E9',
                tension: 0,
                yAxisID: 'y'
            },
            {
                type: 'bar' as const,
                label: 'Chuva (mm)',
                data: hourlyData.map(h => h.rain),
                backgroundColor: 'rgba(14, 165, 233, 0.2)', // Sky 500 light
                borderRadius: 4,
                yAxisID: 'y1'
            }
        ]
    };

    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'start' as const,
                labels: {
                    boxWidth: 10,
                    usePointStyle: true,
                    font: { size: 9, weight: '700' }
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                bodyFont: { size: 10 }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 9 }, color: '#94a3b8' }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { color: '#f1f5f9' },
                ticks: { font: { size: 9 }, color: '#94a3b8', stepSize: 5 }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: { font: { size: 9 }, color: '#94a3b8' },
                min: 0,
                max: 20
            }
        }
    };

    return <Chart type="bar" data={data} options={options} />;
}
