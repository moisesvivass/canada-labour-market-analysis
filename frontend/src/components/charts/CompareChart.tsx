import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { CompareResponse } from '@/types/api';
import { PROVINCE_LIST, YEARS } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { average } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { AIInsight } from '@/components/AIInsight';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { SOURCES } from '@/lib/attribution';
import { LineLegend } from '@/components/ui/LineLegend';
import { Select } from '@/components/ui/select';

// Compares only the months both years have, so a partial year is a fair match.
function compareFinding(data: CompareResponse, geo: string, yearA: string, yearB: string): string | null {
  const a = data[yearA] as number[] | undefined;
  const b = data[yearB] as number[] | undefined;
  if (!a?.length || !b?.length || yearA === yearB) return null;
  const months = Math.min(a.length, b.length);
  const avgA = average(a.slice(0, months));
  const avgB = average(b.slice(0, months));
  if (avgA === null || avgB === null) return null;
  const span = months === 12 ? '' : ` through ${(data.labels as string[])[months - 1]}`;
  const verb = avgB > avgA ? 'higher than' : avgB < avgA ? 'lower than' : 'the same as';
  return `${geo}'s unemployment averaged ${avgB.toFixed(1)}% in ${yearB}${span}, ${verb} ${avgA.toFixed(1)}% over the same months of ${yearA}.`;
}

export function CompareChart() {
  const theme = useChartTheme();
  const [yearA, setYearA] = useState('2024');
  const [yearB, setYearB] = useState('2025');
  const [geo, setGeo] = useState('Canada');

  const { data, loading, error } = useApi<CompareResponse>('/api/compare', {
    year_a: yearA,
    year_b: yearB,
    geo,
  });

  // The baseline year is grey, the year being compared uses the accent color.
  const colorFor = (year: string) =>
    year === yearA && yearA !== yearB ? theme.subtle : theme.accent;

  const chartData = data
    ? {
        labels: data.labels as string[],
        datasets: Object.keys(data)
          .filter((k) => k !== 'labels')
          .map((year) => ({
            label: year,
            data: data[year] as number[],
            borderColor: colorFor(year),
            backgroundColor: colorFor(year),
            pointRadius: 3,
            pointHoverRadius: 5,
          })),
      }
    : { labels: [], datasets: [] };

  const options = useMemo(() => baseLineOptions(theme), [theme]);

  return (
    <ChartPanel
      id="year-over-year"
      title="Year over year"
      finding={data ? compareFinding(data, geo, yearA, yearB) : null}
      loading={loading}
      error={error}
      height={300}
      sources={[SOURCES.lfs]}
      legend={<LineLegend items={[...new Set([yearA, yearB])].map((y) => ({ label: y, color: colorFor(y) }))} />}
      controls={
        <>
          <Select label="Compare" id="cmp-year-a" value={yearA} options={YEARS} onChange={(e) => setYearA(e.target.value)} />
          <Select label="With" id="cmp-year-b" value={yearB} options={YEARS} onChange={(e) => setYearB(e.target.value)} />
          <Select label="Region" id="cmp-geo" value={geo} options={PROVINCE_LIST} onChange={(e) => setGeo(e.target.value)} />
        </>
      }
      insight={<AIInsight chart="compare" geos={geo} yearFrom={yearA} yearTo={yearB} />}
    >
      <Line data={chartData} options={options} />
    </ChartPanel>
  );
}
