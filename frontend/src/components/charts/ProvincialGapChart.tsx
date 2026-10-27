import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { ProvincialGapResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, PROVINCE_LIST, provinceColor } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { formatMonth } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { AIInsight } from '@/components/AIInsight';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { SOURCES } from '@/lib/attribution';
import { LineLegend } from '@/components/ui/LineLegend';
import { Select } from '@/components/ui/select';
import { YearRange } from '@/components/ui/YearRange';

const PROVINCES = PROVINCE_LIST.filter((p) => p !== 'Canada');

function gapFinding(data: ProvincialGapResponse, geoA: string, geoB: string): string | null {
  const last = data.labels.length - 1;
  const a = data.geo_a[last];
  const b = data.geo_b[last];
  if (last < 0 || a === undefined || b === undefined) return null;
  if (a === b) return `In ${formatMonth(data.labels[last])}, ${geoA} and ${geoB} had the same rate: ${a}%.`;
  const [higher, lower] = a > b ? [geoA, geoB] : [geoB, geoA];
  return `In ${formatMonth(data.labels[last])}, ${higher}'s rate was ${Math.abs(a - b).toFixed(1)} points above ${lower}'s (${Math.max(a, b).toFixed(1)}% vs ${Math.min(a, b).toFixed(1)}%).`;
}

export function ProvincialGapChart() {
  const theme = useChartTheme();
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);
  const [geoA, setGeoA] = useState('Ontario');
  const [geoB, setGeoB] = useState('Alberta');

  const { data, loading, error } = useApi<ProvincialGapResponse>('/api/provinces-gap', {
    year_from: yearFrom,
    year_to: yearTo,
    geo_a: geoA,
    geo_b: geoB,
  });

  const colorA = provinceColor(geoA, theme.accent);
  const colorB = provinceColor(geoB, theme.accent);

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.labels,
      datasets: [
        {
          label: geoA,
          data: data.geo_a,
          borderColor: colorA,
          backgroundColor: `${theme.context}55`,
          fill: '+1' as const,
        },
        {
          label: geoB,
          data: data.geo_b,
          borderColor: colorB,
          backgroundColor: 'transparent',
          fill: false as const,
        },
      ],
    };
  }, [data, geoA, geoB, colorA, colorB, theme]);

  const options = useMemo(() => baseLineOptions(theme), [theme]);

  return (
    <ChartPanel
      id="provinces"
      title="The gap between two provinces"
      finding={data ? gapFinding(data, geoA, geoB) : null}
      loading={loading}
      error={error}
      height={320}
      sources={[SOURCES.lfs]}
      legend={<LineLegend items={[{ label: geoA, color: colorA }, { label: geoB, color: colorB }]} />}
      controls={
        <>
          <Select label="Province" id="gap-geo-a" value={geoA} options={PROVINCES} onChange={(e) => setGeoA(e.target.value)} />
          <Select label="Versus" id="gap-geo-b" value={geoB} options={PROVINCES} onChange={(e) => setGeoB(e.target.value)} />
          <YearRange idPrefix="gap" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
      insight={<AIInsight chart="gap" geos={geoA} yearFrom={yearFrom} yearTo={yearTo} />}
    >
      <Line data={chartData} options={options} />
    </ChartPanel>
  );
}
