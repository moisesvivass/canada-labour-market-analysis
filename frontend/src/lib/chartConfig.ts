import type { ChartOptions } from 'chart.js';

const GRID_COLOR = '#1a2030';
const TEXT_COLOR = '#8892a4';
const FONT_MONO = "'IBM Plex Mono', monospace";

export const darkChartDefaults = {
  backgroundColor: '#161b27',
  color: TEXT_COLOR,
};

export function baseLineOptions(yLabel = 'Rate (%)'): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: TEXT_COLOR,
          font: { family: FONT_MONO, size: 11 },
          boxWidth: 12,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#1e2d45',
        titleColor: '#e8edf5',
        bodyColor: TEXT_COLOR,
        borderColor: '#1e2d45',
        borderWidth: 1,
        titleFont: { family: FONT_MONO },
        bodyFont: { family: FONT_MONO, size: 12 },
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${(ctx.parsed.y as number).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: GRID_COLOR },
        ticks: { color: TEXT_COLOR, font: { family: FONT_MONO, size: 11 } },
      },
      y: {
        grid: { color: GRID_COLOR },
        ticks: {
          color: TEXT_COLOR,
          font: { family: FONT_MONO, size: 11 },
          callback: (val) => `${Number(val).toFixed(1)}%`,
        },
        title: {
          display: true,
          text: yLabel,
          color: TEXT_COLOR,
          font: { family: FONT_MONO, size: 11 },
        },
      },
    },
  };
}

export function baseBarOptions(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e2d45',
        titleColor: '#e8edf5',
        bodyColor: TEXT_COLOR,
        borderColor: '#1e2d45',
        borderWidth: 1,
        titleFont: { family: FONT_MONO },
        bodyFont: { family: FONT_MONO, size: 12 },
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${(ctx.parsed.x as number).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: GRID_COLOR },
        ticks: {
          color: TEXT_COLOR,
          font: { family: FONT_MONO, size: 11 },
          callback: (val) => `${val}%`,
        },
      },
      y: {
        grid: { color: GRID_COLOR },
        ticks: { color: TEXT_COLOR, font: { family: FONT_MONO, size: 11 } },
      },
    },
  };
}
