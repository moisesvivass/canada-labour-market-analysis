import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useApi } from '@/hooks/useApi';
import type { MacroDataPoint, UnemploymentResponse } from '@/types/api';
import { YEARS } from '@/lib/constants';
import { AIInsight } from '@/components/AIInsight';
import { Select } from '@/components/ui/select';

const FONT_MONO = "'IBM Plex Mono', monospace";
const GRID_COLOR = '#1a2030';
const TEXT_COLOR = '#8892a4';

export function MacroChart() {
  const [yearFrom, setYearFrom] = useState('2020');
  const [yearTo, setYearTo] = useState(String(new Date().getFullYear()));

  const macroParams = useMemo(
    () => ({ year_from: yearFrom, year_to: yearTo }),
    [yearFrom, yearTo]
  );

  const unempParams = useMemo(
    () => ({ geo: 'Canada', year_from: yearFrom, year_to: yearTo }),
    [yearFrom, yearTo]
  );

  const { data: rateData, loading: rateLoading, error: rateError } =
    useApi<MacroDataPoint[]>('/api/macro/overnight-rate', macroParams);

  const { data: unempData, loading: unempLoading, error: unempError } =
    useApi<UnemploymentResponse>('/api/unemployment', unempParams);

  const loading = rateLoading || unempLoading;
  const error = rateError || unempError;

  const chartData = useMemo(() => {
    if (!rateData || !unempData) return { labels: [], datasets: [] };

    // Build unified month label set from both series
    const rateMonths = rateData.map((d) => d.month);
    const unempMonths = (unempData.labels as string[]) ?? [];
    const allMonths = Array.from(new Set([...unempMonths, ...rateMonths])).sort();

    const rateByMonth = Object.fromEntries(rateData.map((d) => [d.month, d.value]));
    const unempValues = unempData['Canada'] as number[] | undefined;
    const unempByMonth = unempMonths.reduce<Record<string, number>>((acc, m, i) => {
      if (unempValues) acc[m] = unempValues[i];
      return acc;
    }, {});

    return {
      labels: allMonths,
      datasets: [
        {
          label: 'Unemployment Rate',
          data: allMonths.map((m) => unempByMonth[m] ?? null),
          borderColor: '#4f8ef7',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Overnight Rate',
          data: allMonths.map((m) => rateByMonth[m] ?? null),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    };
  }, [rateData, unempData]);

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID_COLOR },
          ticks: { color: TEXT_COLOR, font: { family: FONT_MONO, size: 11 } },
        },
        y: {
          position: 'left',
          grid: { color: GRID_COLOR },
          ticks: {
            color: '#4f8ef7',
            font: { family: FONT_MONO, size: 11 },
            callback: (val) => `${Number(val).toFixed(1)}%`,
          },
          title: {
            display: true,
            text: 'Unemployment (%)',
            color: '#4f8ef7',
            font: { family: FONT_MONO, size: 11 },
          },
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false, color: GRID_COLOR },
          ticks: {
            color: '#f59e0b',
            font: { family: FONT_MONO, size: 11 },
            callback: (val) => `${Number(val).toFixed(2)}%`,
          },
          title: {
            display: true,
            text: 'Overnight Rate (%)',
            color: '#f59e0b',
            font: { family: FONT_MONO, size: 11 },
          },
        },
      },
    }),
    []
  );

  return (
    <section className="relative rounded-lg border border-[#1e2d45] bg-[#161b27] p-5">
      <h2
        className="mb-4 text-lg font-bold text-[#e8edf5]"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Interest Rate vs Unemployment Rate
      </h2>

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          label="Year from"
          id="macro-year-from"
          value={yearFrom}
          onChange={(e) => setYearFrom(e.target.value)}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select
          label="Year to"
          id="macro-year-to"
          value={yearTo}
          onChange={(e) => setYearTo(e.target.value)}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <div className="relative h-72">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[#8892a4]">
            Loading…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-red-400">
            Error: {error}
          </div>
        )}
        {!loading && !error && <Line data={chartData} options={options} />}
      </div>

      <AIInsight chart="macro" geos="Canada" yearFrom={yearFrom} yearTo={yearTo} />
    </section>
  );
}
