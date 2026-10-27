import type { ChartOptions, TooltipOptions } from 'chart.js';
import type { ChartTheme } from '@/lib/theme';
import { formatMonth, signed } from '@/lib/format';

function tooltip(theme: ChartTheme): Partial<TooltipOptions> {
  return {
    backgroundColor: theme.surface,
    titleColor: theme.ink,
    bodyColor: theme.muted,
    borderColor: theme.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 6,
    boxWidth: 8,
    boxHeight: 8,
    boxPadding: 4,
    usePointStyle: true,
    titleFont: { weight: 600 },
  };
}

// Monthly series ("2024-03") get one tick per January, labelled with the year;
// any other label (e.g. "Jan") is shown as is.
function yearTick(this: { getLabelForValue: (v: number) => string }, value: string | number) {
  const label = this.getLabelForValue(Number(value));
  if (!/^\d{4}-\d{2}$/.test(label)) return label;
  return label.endsWith('-01') ? label.slice(0, 4) : null;
}

// Rounds away float noise from Chart.js tick steps (6.6000000000005 -> "6.6%").
export function percentTick(value: string | number): string {
  return `${Number(Number(value).toFixed(2))}%`;
}

export function baseLineOptions(theme: ChartTheme): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    elements: { point: { radius: 0, hoverRadius: 4 }, line: { borderWidth: 2, tension: 0.25 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip(theme),
        itemSort: (a, b) => (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
        callbacks: {
          title: (items) => formatMonth(items[0]?.label ?? ''),
          label: (ctx) => ` ${ctx.dataset.label}  ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        border: { color: theme.border },
        grid: { display: false },
        ticks: { color: theme.subtle, maxRotation: 0, autoSkip: false, callback: yearTick },
      },
      y: {
        border: { display: false },
        grid: { color: theme.grid },
        ticks: { color: theme.subtle, padding: 8, callback: percentTick },
      },
    },
  };
}

export function baseBarOptions(theme: ChartTheme): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip(theme),
        callbacks: {
          label: (ctx) => ` ${signed(ctx.parsed.x ?? 0)}%`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { color: (ctx) => (ctx.tick.value === 0 ? theme.subtle : theme.grid) },
        ticks: { color: theme.subtle, callback: (val) => `${signed(Number(val), Number.isInteger(Number(val)) ? 0 : 1)}%` },
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: theme.muted, font: { size: 12 } },
      },
    },
  };
}
