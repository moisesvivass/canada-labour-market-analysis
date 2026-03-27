import '@/lib/chartSetup';
import { useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { UnemploymentResponse } from '@/types/api';
import { PROVINCE_COLORS, PROVINCE_LIST, ANNOTATIONS, YEARS } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { AIInsight } from '@/components/AIInsight';
import { Select } from '@/components/ui/select';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';

interface UnemploymentChartProps {
  highlightProvince?: string;
}

export function UnemploymentChart({ highlightProvince }: UnemploymentChartProps) {
  const [yearFrom, setYearFrom] = useState('2019');
  const [yearTo, setYearTo] = useState('2026');
  const [selected, setSelected] = useState<string[]>(
    highlightProvince ? [highlightProvince] : []
  );

  useEffect(() => {
    if (highlightProvince) setSelected([highlightProvince]);
  }, [highlightProvince]);

  const params = useMemo(
    () => ({
      year_from: yearFrom,
      year_to: yearTo,
      provinces: selected.join(','),
    }),
    [yearFrom, yearTo, selected]
  );

  const { data, loading, error } = useApi<UnemploymentResponse>(
    '/api/unemployment',
    params
  );

  const toggleProvince = (prov: string) => {
    setSelected((prev) =>
      prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov]
    );
  };

  const selectAll = () => setSelected([...PROVINCE_LIST]);
  const clearAll = () => setSelected([]);

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const geos = Object.keys(data).filter((k) => k !== 'labels');
    return {
      labels: data.labels as string[],
      datasets: geos.map((geo) => ({
        label: geo,
        data: data[geo] as number[],
        borderColor: PROVINCE_COLORS[geo] ?? '#8892a4',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
      })),
    };
  }, [data]);

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
        borderColor: '#8892a4',
        borderWidth: 1,
        borderDash: [4, 4],
        label: {
          display: true,
          content: ann.label,
          position: 'start',
          backgroundColor: '#1e2d45',
          color: '#e8edf5',
          font: { family: "'IBM Plex Mono', monospace", size: 10 },
          padding: { x: 6, y: 4 },
        },
      };
    });
    return result;
  }, [data]);

  const options = useMemo(() => {
    const base = baseLineOptions();
    return {
      ...base,
      plugins: {
        ...base.plugins,
        annotation: { annotations },
      },
    };
  }, [annotations]);

  return (
    <section className="relative rounded-lg border border-[#1e2d45] bg-[#161b27] p-5">
      <h2
        className="mb-4 text-lg font-bold text-[#e8edf5]"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Unemployment Rate Trend
      </h2>

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          label="Year from"
          id="uf-year-from"
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
          id="uf-year-to"
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

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="font-mono text-xs text-[#4f8ef7] hover:underline"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="font-mono text-xs text-[#8892a4] hover:underline"
        >
          Clear
        </button>
        {PROVINCE_LIST.map((prov) => (
          <button
            type="button"
            key={prov}
            onClick={() => toggleProvince(prov)}
            className="rounded px-2 py-0.5 font-mono text-xs transition-colors"
            style={{
              backgroundColor: selected.includes(prov)
                ? (PROVINCE_COLORS[prov] ?? '#8892a4') + '33'
                : '#1a2030',
              color: selected.includes(prov)
                ? (PROVINCE_COLORS[prov] ?? '#e8edf5')
                : '#8892a4',
              border: `1px solid ${selected.includes(prov) ? (PROVINCE_COLORS[prov] ?? '#8892a4') : '#1e2d45'}`,
            }}
          >
            {prov}
          </button>
        ))}
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
        {!loading && !error && (
          <Line data={chartData} options={options} />
        )}
      </div>

      <AIInsight
        chart="unemployment"
        geo={selected[0] ?? 'Canada'}
        yearFrom={yearFrom}
        yearTo={yearTo}
      />
    </section>
  );
}
