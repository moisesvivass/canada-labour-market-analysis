import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { ProvincialGapResponse } from '@/types/api';
import { PROVINCE_LIST, PROVINCE_COLORS, YEARS } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { AIInsight } from '@/components/AIInsight';
import { Select } from '@/components/ui/select';
import type { ChartOptions } from 'chart.js';

export function ProvincialGapChart() {
  const [yearFrom, setYearFrom] = useState('2019');
  const [yearTo, setYearTo] = useState('2026');
  const [geoA, setGeoA] = useState('Ontario');
  const [geoB, setGeoB] = useState('Alberta');

  const params = useMemo(
    () => ({ year_from: yearFrom, year_to: yearTo, geo_a: geoA, geo_b: geoB }),
    [yearFrom, yearTo, geoA, geoB]
  );

  const { data, loading, error } = useApi<ProvincialGapResponse>(
    '/api/provinces-gap',
    params
  );

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.labels,
      datasets: [
        {
          label: geoA,
          data: data.geo_a,
          borderColor: PROVINCE_COLORS[geoA] ?? '#4f8ef7',
          backgroundColor: (PROVINCE_COLORS[geoA] ?? '#4f8ef7') + '22',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: '+1' as const,
        },
        {
          label: geoB,
          data: data.geo_b,
          borderColor: PROVINCE_COLORS[geoB] ?? '#f59e0b',
          backgroundColor: (PROVINCE_COLORS[geoB] ?? '#f59e0b') + '22',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false as const,
        },
      ],
    };
  }, [data, geoA, geoB]);

  const options: ChartOptions<'line'> = useMemo(() => {
    const base = baseLineOptions();
    return {
      ...base,
      plugins: {
        ...base.plugins,
        filler: { propagate: true },
      },
    };
  }, []);

  return (
    <section className="relative rounded-lg border border-[#1e2d45] bg-[#161b27] p-5">
      <h2
        className="mb-4 text-lg font-bold text-[#e8edf5]"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Provincial Gap
      </h2>

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          label="Year from"
          id="gap-year-from"
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
          id="gap-year-to"
          value={yearTo}
          onChange={(e) => setYearTo(e.target.value)}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select
          label="Province A"
          id="gap-geo-a"
          value={geoA}
          onChange={(e) => setGeoA(e.target.value)}
        >
          {PROVINCE_LIST.filter((p) => p !== 'Canada').map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select
          label="Province B"
          id="gap-geo-b"
          value={geoB}
          onChange={(e) => setGeoB(e.target.value)}
        >
          {PROVINCE_LIST.filter((p) => p !== 'Canada').map((p) => (
            <option key={p} value={p}>
              {p}
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
        {!loading && !error && (
          <Line data={chartData} options={options} />
        )}
      </div>

      <AIInsight chart="gap" geos={geoA} yearFrom={yearFrom} yearTo={yearTo} />
    </section>
  );
}
