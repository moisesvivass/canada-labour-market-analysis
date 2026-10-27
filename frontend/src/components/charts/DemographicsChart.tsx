import '@/lib/chartSetup';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useApi } from '@/hooks/useApi';
import type { AgeGroup, DemographicsResponse, GenderGroup } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO, PROVINCE_LIST, SERIES_COLORS } from '@/lib/constants';
import { baseLineOptions } from '@/lib/chartConfig';
import { SOURCES } from '@/lib/attribution';
import { formatMonth, latest, pct } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { LineLegend } from '@/components/ui/LineLegend';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/select';
import { YearRange } from '@/components/ui/YearRange';

type View = 'age' | 'gender';

const AGE_LABELS: Record<AgeGroup, string> = {
  '15 to 24 years': 'Youth (15–24)',
  '25 to 54 years': 'Core age (25–54)',
  '55 years and over': '55 and over',
};
const GENDER_LABELS: Record<GenderGroup, string> = { 'Men+': 'Men', 'Women+': 'Women' };

function demographicsFinding(data: DemographicsResponse, geo: string): string | null {
  const youth = latest(data.by_age['15 to 24 years']);
  const core = latest(data.by_age['25 to 54 years']);
  const partTime = latest(data.part_time_share);
  const month = data.labels.at(-1);
  if (youth === null || core === null || !month) return null;
  const ratio = (youth / core).toFixed(1);
  const pt = partTime !== null ? ` ${pct(partTime)} of jobs are part-time.` : '';
  return `In ${formatMonth(month)}, youth unemployment in ${geo} was ${pct(youth)}, ${ratio}× the ${pct(core)} rate for core-age workers.${pt}`;
}

export function DemographicsChart() {
  const theme = useChartTheme();
  const [geo, setGeo] = useState('Canada');
  const [view, setView] = useState<View>('age');
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(DEFAULT_YEAR_TO);

  const { data, loading, error } = useApi<DemographicsResponse>('/api/demographics', {
    geo,
    year_from: yearFrom,
    year_to: yearTo,
  });

  const groups =
    view === 'age'
      ? (Object.keys(AGE_LABELS) as AgeGroup[]).map((k, i) => ({
          label: AGE_LABELS[k],
          data: data?.by_age[k] ?? [],
          color: [theme.negative, theme.accent, theme.subtle][i],
        }))
      : (Object.keys(GENDER_LABELS) as GenderGroup[]).map((k, i) => ({
          label: GENDER_LABELS[k],
          data: data?.by_gender[k] ?? [],
          color: [theme.accent, SERIES_COLORS.rose][i],
        }));

  const chartData = {
    labels: data?.labels ?? [],
    datasets: groups.map((g) => ({ label: g.label, data: g.data, borderColor: g.color, backgroundColor: g.color })),
  };

  const viewToggle = (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-subtle">Compare by</span>
      <SegmentedControl
        label="Compare by"
        options={[{ value: 'age', label: 'Age' }, { value: 'gender', label: 'Gender' }]}
        value={view}
        onChange={setView}
      />
    </div>
  );

  return (
    <ChartPanel
      id="who"
      title="Who is unemployed"
      finding={data ? demographicsFinding(data, geo) : null}
      loading={loading}
      error={error}
      height={320}
      sources={[SOURCES.lfs]}
      referenceMonth={data?.labels.at(-1)}
      legend={<LineLegend items={groups.map((g) => ({ label: g.label, color: g.color }))} />}
      controls={
        <>
          <Select label="Region" id="who-geo" value={geo} options={PROVINCE_LIST} onChange={(e) => setGeo(e.target.value)} />
          {viewToggle}
          <YearRange idPrefix="who" from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
        </>
      }
    >
      <Line data={chartData} options={baseLineOptions(theme)} />
    </ChartPanel>
  );
}
