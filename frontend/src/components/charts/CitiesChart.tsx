import '@/lib/chartSetup';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useApi } from '@/hooks/useApi';
import type { CitiesResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, provinceColor } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { SOURCES } from '@/lib/attribution';
import { formatMonth, latest, pct } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { LineLegend } from '@/components/ui/LineLegend';
import { Select } from '@/components/ui/select';
import { YearRange } from '@/components/ui/YearRange';

const CITIES = ['Toronto', 'Montréal', 'Vancouver'];
// 95% confidence band from StatCan's published standard error of the estimate.
const Z95 = 1.96;
// Band datasets are named for the CSV export and hidden from the tooltip.
const BAND_SUFFIX = '95% bound';

function citiesFinding(data: CitiesResponse, city: string): string | null {
  const c = data.cities[city];
  if (!c) return null;
  const rate = latest(c.estimate);
  const se = latest(c.standard_error);
  const province = latest(data.regions[c.province]);
  const canada = latest(data.regions['Canada']);
  const month = data.labels.at(-1);
  if (rate === null || province === null || canada === null || !month) return null;
  const margin = se !== null ? ` (±${(Z95 * se).toFixed(1)})` : '';
  return `${city}'s unemployment rate was ${pct(rate)}${margin} in ${formatMonth(month)}, against ${pct(province)} in ${c.province} and ${pct(canada)} nationally.`;
}

export function CitiesChart() {
  const theme = useChartTheme();
  const [city, setCity] = useState('Toronto');
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);

  const { data, loading, error } = useApi<CitiesResponse>('/api/cities', { year_from: yearFrom, year_to: yearTo });

  const selected = data?.cities[city];
  const province = selected?.province ?? '';
  const bound = (sign: 1 | -1) =>
    selected?.estimate.map((v, i) => {
      const se = selected.standard_error[i];
      return v === null || se === null ? null : v + sign * Z95 * se;
    }) ?? [];

  const chartData = {
    labels: data?.labels ?? [],
    datasets: [
      { label: `${city} upper ${BAND_SUFFIX}`, data: bound(1), borderColor: 'transparent', backgroundColor: 'transparent', pointHoverRadius: 0 },
      { label: `${city} lower ${BAND_SUFFIX}`, data: bound(-1), borderColor: 'transparent', backgroundColor: `${theme.accent}1f`, fill: '-1' as const, pointHoverRadius: 0 },
      { label: city, data: selected?.estimate ?? [], borderColor: theme.accent, backgroundColor: theme.accent, borderWidth: 2.5 },
      { label: province, data: data?.regions[province] ?? [], borderColor: provinceColor(province, theme.accent), backgroundColor: provinceColor(province, theme.accent) },
      { label: 'Canada', data: data?.regions['Canada'] ?? [], borderColor: theme.subtle, backgroundColor: theme.subtle, borderDash: [4, 4] },
    ],
  };

  const base = baseLineOptions(theme);
  const options: ChartOptions<'line'> = {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: { ...base.plugins?.tooltip, filter: (item) => !item.dataset.label?.endsWith(BAND_SUFFIX) },
    },
  };

  return (
    <ChartPanel
      id="cities"
      title="Toronto, Montréal and Vancouver"
      finding={data ? citiesFinding(data, city) : null}
      loading={loading}
      error={error}
      height={320}
      sources={[SOURCES.cities, SOURCES.lfs]}
      referenceMonth={data?.labels.at(-1)}
      legend={
        <LineLegend
          items={[
            { label: `${city} (shaded: 95% confidence band)`, color: theme.accent },
            { label: province, color: provinceColor(province, theme.accent) },
            { label: 'Canada', color: theme.subtle },
          ]}
        />
      }
      controls={
        <>
          <Select label="City" id="city" value={city} options={CITIES} onChange={(e) => setCity(e.target.value)} />
          <YearRange idPrefix="city" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
    >
      <Line data={chartData} options={options} />
    </ChartPanel>
  );
}
