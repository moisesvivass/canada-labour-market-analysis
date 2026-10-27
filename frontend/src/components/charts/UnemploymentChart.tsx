import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { useApi } from '@/hooks/useApi';
import type { UnemploymentResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, PROVINCE_LIST, ANNOTATIONS, provinceColor } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { formatMonth, pct } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { AIInsight } from '@/components/AIInsight';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { SOURCES } from '@/lib/attribution';
import { YearRange } from '@/components/ui/YearRange';

interface UnemploymentChartProps {
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}

function trendFinding(data: UnemploymentResponse, geo: string): string | null {
  const labels = data.labels as string[];
  const values = data[geo] as number[] | undefined;
  if (!values?.length) return null;
  const last = values.length - 1;
  const peak = values.indexOf(Math.max(...values));
  if (peak === last) return `${geo} is at ${pct(values[last])} in ${formatMonth(labels[last])}, the highest in this period.`;
  return `${geo} is at ${pct(values[last])} in ${formatMonth(labels[last])}, versus a peak of ${pct(values[peak])} in ${formatMonth(labels[peak])}.`;
}

export function UnemploymentChart({ selected, onSelectedChange }: UnemploymentChartProps) {
  const theme = useChartTheme();
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);

  // The endpoint returns every geography, so province toggles don't refetch.
  const { data, loading, error } = useApi<UnemploymentResponse>('/api/unemployment', {
    year_from: yearFrom,
    year_to: yearTo,
  });

  const toggleProvince = (prov: string) => {
    onSelectedChange(selected.includes(prov) ? selected.filter((p) => p !== prov) : [...selected, prov]);
  };

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const geos = Object.keys(data).filter((k) => k !== 'labels');
    return {
      labels: data.labels as string[],
      datasets: geos.map((geo) => {
        const active = selected.includes(geo);
        return {
          label: geo,
          data: data[geo] as number[],
          borderColor: active ? provinceColor(geo, theme.accent) : theme.context,
          borderWidth: active ? (geo === 'Canada' ? 2.5 : 2) : 1,
          backgroundColor: 'transparent',
          pointHoverRadius: active ? 4 : 0,
          order: active ? 0 : 1,
        };
      }),
    };
  }, [data, selected, theme]);

  const annotations = useMemo(() => {
    if (!data?.labels) return {};
    const labels = data.labels as string[];
    const result: Record<string, AnnotationOptions> = {};

    Object.entries(ANNOTATIONS).forEach(([key, ann]) => {
      const idx = labels.findIndex((l) => l.startsWith(ann.date));
      if (idx === -1) return;
      result[key] = {
        type: 'line',
        xMin: idx,
        xMax: idx,
        borderColor: theme.subtle,
        borderWidth: 1,
        borderDash: [3, 3],
        label: {
          // Event labels collide on phone-width charts; the dashed lines stay.
          display: (ctx) => ctx.chart.width > 560,
          content: ann.label,
          position: 'start',
          backgroundColor: theme.surface,
          color: theme.muted,
          font: { size: 11, weight: 500 },
          padding: { x: 4, y: 2 },
        },
      };
    });
    return result;
  }, [data, theme]);

  const options = useMemo(() => {
    const base = baseLineOptions(theme);
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins?.tooltip,
          filter: (item: { dataset: { label?: string } }) => selected.includes(item.dataset.label ?? ''),
        },
        annotation: { annotations },
      },
    };
  }, [annotations, selected, theme]);

  const finding = data ? trendFinding(data, selected[0] ?? 'Canada') : null;

  const legend = (
    <div className="flex flex-wrap items-center gap-1.5">
      {PROVINCE_LIST.map((prov) => {
        const active = selected.includes(prov);
        return (
          <button
            type="button"
            key={prov}
            onClick={() => toggleProvince(prov)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active ? 'border-line bg-surface font-medium text-ink shadow-sm' : 'border-transparent text-subtle hover:text-ink'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: active ? provinceColor(prov, theme.accent) : theme.context }}
            />
            {prov}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onSelectedChange(['Canada'])}
        className="ml-1 px-1.5 py-1 text-xs font-medium text-accent hover:underline"
      >
        Reset
      </button>
    </div>
  );

  return (
    <ChartPanel
      id="trend"
      title="Unemployment rate by province"
      finding={finding}
      loading={loading}
      error={error}
      height={340}
      sources={[SOURCES.lfs]}
      legend={legend}
      controls={
        <>
          <YearRange idPrefix="uf" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
      insight={
        <AIInsight chart="unemployment" geos={selected.join(',') || 'Canada'} yearFrom={yearFrom} yearTo={yearTo} />
      }
    >
      <Line data={chartData} options={options} />
    </ChartPanel>
  );
}
