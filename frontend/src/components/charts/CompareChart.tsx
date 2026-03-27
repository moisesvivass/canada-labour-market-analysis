import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { CompareResponse } from '@/types/api';
import { PROVINCE_LIST, YEARS } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { AIInsight } from '@/components/AIInsight';
import { Select } from '@/components/ui/select';

const YEAR_COLORS = ['#4f8ef7', '#f59e0b', '#10b981', '#e879f9', '#06b6d4'];

export function CompareChart() {
  const [yearA, setYearA] = useState('2024');
  const [yearB, setYearB] = useState('2025');
  const [geo, setGeo] = useState('Canada');

  const params = useMemo(
    () => ({ year_a: yearA, year_b: yearB, geo }),
    [yearA, yearB, geo]
  );

  const { data, loading, error } = useApi<CompareResponse>(
    '/api/compare',
    params
  );

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const years = Object.keys(data).filter((k) => k !== 'labels');
    return {
      labels: data.labels as string[],
      datasets: years.map((year, i) => ({
        label: year,
        data: data[year] as number[],
        borderColor: YEAR_COLORS[i % YEAR_COLORS.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
      })),
    };
  }, [data]);

  const options = useMemo(() => baseLineOptions(), []);

  return (
    <section className="relative rounded-lg border border-[#1e2d45] bg-[#161b27] p-5">
      <h2
        className="mb-4 text-lg font-bold text-[#e8edf5]"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Year-over-Year Comparison
      </h2>

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          label="Year A"
          id="cmp-year-a"
          value={yearA}
          onChange={(e) => setYearA(e.target.value)}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select
          label="Year B"
          id="cmp-year-b"
          value={yearB}
          onChange={(e) => setYearB(e.target.value)}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select
          label="Province"
          id="cmp-geo"
          value={geo}
          onChange={(e) => setGeo(e.target.value)}
        >
          {PROVINCE_LIST.map((p) => (
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

      <AIInsight chart="compare" geo={geo} yearFrom={yearA} yearTo={yearB} />
    </section>
  );
}
