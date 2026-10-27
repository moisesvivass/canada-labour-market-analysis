import '@/lib/chartSetup';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useApi } from '@/hooks/useApi';
import type { TightnessResponse } from '@/types/api';
import { baseBarOptions } from '@/lib/chartConfig';
import { SOURCES } from '@/lib/attribution';
import { formatMonth } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { ChartPanel } from '@/components/ui/ChartPanel';

function tightnessFinding(data: TightnessResponse): string | null {
  const provinces = data.provinces.filter((p) => p.geography !== 'Canada');
  const canada = data.provinces.find((p) => p.geography === 'Canada');
  if (!provinces.length || !canada || !data.month) return null;
  const loosest = provinces[0];
  const tightest = provinces[provinces.length - 1];
  return `In ${formatMonth(data.month)} there were ${canada.unemployed_per_vacancy.toFixed(1)} unemployed people for every job vacancy in Canada, from ${tightest.unemployed_per_vacancy.toFixed(1)} in ${tightest.geography} to ${loosest.unemployed_per_vacancy.toFixed(1)} in ${loosest.geography}.`;
}

export function TightnessChart() {
  const theme = useChartTheme();
  const { data, loading, error } = useApi<TightnessResponse>('/api/tightness');

  const rows = data?.provinces ?? [];
  const chartData = {
    labels: rows.map((p) => p.geography),
    datasets: [
      {
        label: 'Unemployed per vacancy',
        data: rows.map((p) => p.unemployed_per_vacancy),
        backgroundColor: rows.map((p) => (p.geography === 'Canada' ? theme.ink : theme.accent)),
        borderRadius: 3,
        barPercentage: 0.7,
      },
    ],
  };

  const base = baseBarOptions(theme);
  const options: ChartOptions<'bar'> = {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins?.tooltip,
        callbacks: {
          label: (ctx) => {
            const p = rows[ctx.dataIndex];
            return ` ${p.unemployed_per_vacancy.toFixed(1)} unemployed per vacancy (vacancy rate ${p.vacancy_rate}%)`;
          },
        },
      },
    },
    scales: {
      ...base.scales,
      x: { ...base.scales?.x, ticks: { color: theme.subtle, callback: (v) => `${v}` } },
    },
  };

  return (
    <ChartPanel
      id="tightness"
      title="How hard is it to find a job"
      finding={data ? tightnessFinding(data) : null}
      loading={loading}
      error={error}
      height={360}
      sources={[SOURCES.vacancies, SOURCES.lfs]}
      referenceMonth={data?.month}
      legend={
        <p className="text-xs text-muted">
          Unemployed people for every job vacancy. Higher means more competition for each opening. Vacancy data
          runs about two months behind the Labour Force Survey.
        </p>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartPanel>
  );
}
