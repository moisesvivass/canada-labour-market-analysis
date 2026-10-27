import '@/lib/chartSetup';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useApi } from '@/hooks/useApi';
import type { InflationResponse, WagesResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, PROVINCE_LIST, SERIES_COLORS } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { SOURCES } from '@/lib/attribution';
import { formatMonth, latest, pct, signed } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { LineLegend } from '@/components/ui/LineLegend';
import { Select } from '@/components/ui/select';
import { YearRange } from '@/components/ui/YearRange';

function inflationFinding(data: InflationResponse): string | null {
  const headline = latest(data.headline);
  const trim = latest(data.cpi_trim);
  const median = latest(data.cpi_median);
  const month = data.labels.at(-1);
  if (headline === null || trim === null || median === null || !month) return null;
  return `Consumer prices rose ${pct(headline)} over the year to ${formatMonth(month)}; the Bank of Canada's core measures, which strip out volatile items, ran at ${pct(trim)} (trim) and ${pct(median)} (median), against a ${pct(data.target)} target.`;
}

export function InflationChart() {
  const theme = useChartTheme();
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);
  const { data, loading, error } = useApi<InflationResponse>('/api/inflation', { year_from: yearFrom, year_to: yearTo });

  const lines = [
    { label: 'Headline CPI', data: data?.headline ?? [], color: theme.ink },
    { label: 'CPI-trim', data: data?.cpi_trim ?? [], color: theme.accent },
    { label: 'CPI-median', data: data?.cpi_median ?? [], color: SERIES_COLORS.teal },
  ];

  const base = baseLineOptions(theme);
  const options: ChartOptions<'line'> = {
    ...base,
    plugins: {
      ...base.plugins,
      annotation: {
        annotations: {
          // The Bank's 1-3% inflation-control range, with the 2% target.
          range: { type: 'box', yMin: 1, yMax: 3, backgroundColor: `${theme.accent}12`, borderWidth: 0 },
          target: {
            type: 'line', yMin: 2, yMax: 2, borderColor: theme.subtle, borderWidth: 1, borderDash: [3, 3],
            label: { display: true, content: '2% target', position: 'end', backgroundColor: theme.surface, color: theme.muted, font: { size: 11 } },
          },
        },
      },
    },
  };

  return (
    <ChartPanel
      id="inflation"
      title="Inflation against the 2% target"
      finding={data ? inflationFinding(data) : null}
      loading={loading}
      error={error}
      height={320}
      sources={[SOURCES.cpi]}
      legend={<LineLegend items={[...lines.map((l) => ({ label: l.label, color: l.color })), { label: '1–3% control range (shaded)', color: `${theme.accent}55` }]} />}
      controls={<YearRange idPrefix="cpi" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />}
    >
      <Line
        data={{ labels: data?.labels ?? [], datasets: lines.map((l) => ({ label: l.label, data: l.data, borderColor: l.color, backgroundColor: l.color })) }}
        options={options}
      />
    </ChartPanel>
  );
}

function wagesFinding(data: WagesResponse, geo: string): string | null {
  const i = data.labels.length - 1;
  if (i < 0) return null;
  const real = data.real_wage_growth[i];
  const verdict = real > 0 ? 'outpacing' : real < 0 ? 'falling behind' : 'keeping pace with';
  return `In ${formatMonth(data.labels[i])}, average weekly earnings in ${geo} were up ${pct(data.wage_growth[i])} from a year earlier, ${verdict} inflation of ${pct(data.inflation[i])}: real wage growth of ${signed(real)} points.`;
}

export function WagesChart() {
  const theme = useChartTheme();
  const [geo, setGeo] = useState('Canada');
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);
  const { data, loading, error } = useApi<WagesResponse>('/api/wages', { geo, year_from: yearFrom, year_to: yearTo });

  const chartData = {
    labels: data?.labels ?? [],
    datasets: [
      // Shaded gap between the two lines is real wage growth: green when pay beats prices.
      {
        label: 'Wage growth',
        data: data?.wage_growth ?? [],
        borderColor: theme.accent,
        backgroundColor: theme.accent,
        fill: { target: '+1', above: `${theme.positive}22`, below: `${theme.negative}22` },
      },
      { label: 'Inflation', data: data?.inflation ?? [], borderColor: theme.ink, backgroundColor: theme.ink, borderDash: [4, 4] },
    ],
  };

  return (
    <ChartPanel
      id="wages"
      title="Are wages keeping up with prices"
      finding={data ? wagesFinding(data, geo) : null}
      loading={loading}
      error={error}
      height={320}
      sources={[SOURCES.earnings, SOURCES.cpi]}
      referenceMonth={data?.labels.at(-1)}
      legend={
        <LineLegend
          items={[
            { label: 'Average weekly earnings, year-over-year', color: theme.accent },
            { label: 'CPI inflation, year-over-year', color: theme.ink },
          ]}
        />
      }
      controls={
        <>
          <Select label="Region" id="wages-geo" value={geo} options={PROVINCE_LIST} onChange={(e) => setGeo(e.target.value)} />
          <YearRange idPrefix="wages" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
    >
      <Line data={chartData} options={baseLineOptions(theme)} />
    </ChartPanel>
  );
}
