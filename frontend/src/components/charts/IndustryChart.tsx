import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { IndustryResponse } from '@/types/api';
import { PROVINCE_LIST, YEARS } from '@/lib/constants';
import { baseBarOptions } from '@/lib/chartConfig';
import { AIInsight } from '@/components/AIInsight';
import { Select } from '@/components/ui/select';

export function IndustryChart() {
  const [yearFrom, setYearFrom] = useState('2020');
  const [yearTo, setYearTo] = useState('2026');
  const [geo, setGeo] = useState('Canada');

  const params = useMemo(
    () => ({ year_from: yearFrom, year_to: yearTo, geo }),
    [yearFrom, yearTo, geo]
  );

  const { data, loading, error } = useApi<IndustryResponse>(
    '/api/industries',
    params
  );

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.industries,
      datasets: [
        {
          label: 'Change (%)',
          data: data.pct_change,
          backgroundColor: data.pct_change.map((v) =>
            v >= 0 ? '#10b98133' : '#fb718533'
          ),
          borderColor: data.pct_change.map((v) =>
            v >= 0 ? '#10b981' : '#fb7185'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const barHeight = useMemo(
    () => (data ? Math.max(data.industries.length * 36, 300) : 300),
    [data]
  );

  const options = useMemo(() => baseBarOptions(), []);

  return (
    <section className="relative rounded-lg border border-[#1e2d45] bg-[#161b27] p-5">
      <h2
        className="mb-4 text-lg font-bold text-[#e8edf5]"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Industry Winners &amp; Losers
      </h2>

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          label="Year from"
          id="ind-year-from"
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
          id="ind-year-to"
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
          label="Province"
          id="ind-geo"
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

      <div className="relative overflow-x-auto" style={{ height: barHeight }}>
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
          <Bar data={chartData} options={options} />
        )}
      </div>

      <AIInsight chart="industry" geos={geo} yearFrom={yearFrom} yearTo={yearTo} />
    </section>
  );
}
