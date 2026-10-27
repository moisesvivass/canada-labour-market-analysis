import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useApi } from '@/hooks/useApi';
import type { MacroDataPoint, UnemploymentResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO } from '@/lib/constants';
import { baseLineOptions, percentTick } from '@/lib/chartConfig';
import { formatMonth } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { AIInsight } from '@/components/AIInsight';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { LineLegend } from '@/components/ui/LineLegend';
import { YearRange } from '@/components/ui/YearRange';

function macroFinding(rateData: MacroDataPoint[]): string | null {
  if (rateData.length === 0) return null;
  const latest = rateData[rateData.length - 1];
  const peak = rateData.reduce((max, d) => (d.value > max.value ? d : max));
  if (peak.value === latest.value) {
    return `The Bank of Canada's overnight rate stands at ${latest.value.toFixed(2)}% in ${formatMonth(latest.month)}, its high for this period.`;
  }
  return `The Bank of Canada's overnight rate is ${latest.value.toFixed(2)}% in ${formatMonth(latest.month)}, down from a peak of ${peak.value.toFixed(2)}% in ${formatMonth(peak.month)}.`;
}

export function MacroChart() {
  const theme = useChartTheme();
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);
  const range = { year_from: yearFrom, year_to: yearTo };

  const { data: rateData, loading: rateLoading, error: rateError } =
    useApi<MacroDataPoint[]>('/api/macro/overnight-rate', range);

  const { data: unempData, loading: unempLoading, error: unempError } =
    useApi<UnemploymentResponse>('/api/unemployment', { ...range, geo: 'Canada' });

  const loading = rateLoading || unempLoading;
  const error = rateError || unempError;

  const chartData = useMemo(() => {
    if (!rateData || !unempData) return { labels: [], datasets: [] };

    // Build unified month label set from both series
    const rateMonths = rateData.map((d) => d.month);
    const unempMonths = unempData.labels as string[];
    const allMonths = Array.from(new Set([...unempMonths, ...rateMonths])).sort();

    const rateByMonth = Object.fromEntries(rateData.map((d) => [d.month, d.value]));
    const unempValues = unempData['Canada'] as number[] | undefined;
    const unempByMonth = Object.fromEntries(unempMonths.map((m, i) => [m, unempValues?.[i]]));

    return {
      labels: allMonths,
      datasets: [
        {
          label: 'Unemployment rate',
          data: allMonths.map((m) => unempByMonth[m] ?? null),
          borderColor: theme.accent,
          backgroundColor: theme.accent,
          yAxisID: 'y',
        },
        {
          label: 'Overnight rate',
          data: allMonths.map((m) => rateByMonth[m] ?? null),
          borderColor: theme.ink,
          backgroundColor: theme.ink,
          stepped: true,
          yAxisID: 'y1',
        },
      ],
    };
  }, [rateData, unempData, theme]);

  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = baseLineOptions(theme);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins?.tooltip,
          callbacks: {
            ...base.plugins?.tooltip?.callbacks,
            label: (ctx) =>
              ` ${ctx.dataset.label}  ${(ctx.parsed.y ?? 0).toFixed(ctx.dataset.yAxisID === 'y1' ? 2 : 1)}%`,
          },
        },
      },
      scales: {
        ...base.scales,
        y: {
          ...base.scales?.y,
          position: 'left',
          title: { display: true, text: 'Unemployment', color: theme.accent },
        },
        y1: {
          position: 'right',
          border: { display: false },
          grid: { drawOnChartArea: false },
          ticks: { color: theme.subtle, padding: 8, callback: percentTick },
          title: { display: true, text: 'Overnight rate', color: theme.ink },
        },
      },
    };
  }, [theme]);

  return (
    <ChartPanel
      id="rates"
      title="Interest rates and unemployment"
      finding={rateData ? macroFinding(rateData) : null}
      loading={loading}
      error={error}
      height={320}
      source="Bank of Canada Valet API (V39079) · Statistics Canada, Table 14-10-0287-01"
      legend={
        <LineLegend
          items={[
            { label: 'Unemployment rate, Canada (left)', color: theme.accent },
            { label: 'Bank of Canada overnight rate (right)', color: theme.ink },
          ]}
        />
      }
      controls={
        <>
          <YearRange idPrefix="macro" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
      insight={<AIInsight chart="macro" geos="Canada" yearFrom={yearFrom} yearTo={yearTo} />}
    >
      <Line data={chartData} options={options} />
    </ChartPanel>
  );
}
