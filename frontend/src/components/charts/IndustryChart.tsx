import '@/lib/chartSetup';
import { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { IndustryResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, PROVINCE_LIST } from '@/lib/constants';
import { baseBarOptions } from '@/lib/chartConfig';
import { signed } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { AIInsight } from '@/components/AIInsight';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { Select } from '@/components/ui/select';
import { YearRange } from '@/components/ui/YearRange';

// Rows arrive sorted by pct_change, highest first.
function industryFinding(data: IndustryResponse, yearFrom: string, yearTo: string): string | null {
  const n = data.industries.length;
  if (n < 2) return null;
  const top = `${data.industries[0]} (${signed(data.pct_change[0])}%)`;
  const bottom = `${data.industries[n - 1]} (${signed(data.pct_change[n - 1])}%)`;
  const bottomVerb = data.pct_change[n - 1] < 0 ? 'shrank the most' : 'grew the least';
  return `From ${yearFrom} to ${yearTo}, ${top} grew the most, while ${bottom} ${bottomVerb}.`;
}

export function IndustryChart() {
  const theme = useChartTheme();
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);
  const [geo, setGeo] = useState('Canada');

  const { data, loading, error } = useApi<IndustryResponse>('/api/industries', {
    year_from: yearFrom,
    year_to: yearTo,
    geo,
  });

  const chartData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.industries,
      datasets: [
        {
          label: 'Change (%)',
          data: data.pct_change,
          backgroundColor: data.pct_change.map((v) => (v >= 0 ? theme.accent : theme.negative)),
          borderRadius: 3,
          barPercentage: 0.7,
        },
      ],
    };
  }, [data, theme]);

  const options = useMemo(() => baseBarOptions(theme), [theme]);

  return (
    <ChartPanel
      id="industries"
      title="Which industries gained and lost jobs"
      finding={data ? industryFinding(data, yearFrom, yearTo) : null}
      loading={loading}
      error={error}
      height={data ? Math.max(data.industries.length * 30, 300) : 420}
      source="Statistics Canada, Table 14-10-0355-01 · change in average annual employment"
      controls={
        <>
          <Select label="Region" id="ind-geo" value={geo} options={PROVINCE_LIST} onChange={(e) => setGeo(e.target.value)} />
          <YearRange idPrefix="ind" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
      insight={<AIInsight chart="industry" geos={geo} yearFrom={yearFrom} yearTo={yearTo} />}
    >
      <Bar data={chartData} options={options} />
    </ChartPanel>
  );
}
