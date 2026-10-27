import { useApi } from '@/hooks/useApi';
import type { CitiesResponse, DemographicsResponse, TightnessResponse, WagesResponse } from '@/types/api';
import { DEFAULT_YEAR_FROM, DEFAULT_YEAR_TO } from '@/lib/constants';
import { formatMonth, latest, pct, signed } from '@/lib/format';

// Same parameters as the sections below, so each request is shared rather than repeated.
const RANGE = { year_from: DEFAULT_YEAR_FROM, year_to: DEFAULT_YEAR_TO };

interface Finding {
  value: string;
  label: string;
  detail: string;
  href: string;
}

function FindingCard({ value, label, detail, href }: Finding) {
  return (
    <a href={href} className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
      <p className="mt-3 text-xs font-medium text-accent group-hover:underline">See the data →</p>
    </a>
  );
}

/** Four headline findings computed from the latest data, each linking to its section. */
export function KeyFindings() {
  const demographics = useApi<DemographicsResponse>('/api/demographics', { geo: 'Canada', ...RANGE });
  const cities = useApi<CitiesResponse>('/api/cities', RANGE);
  const tightness = useApi<TightnessResponse>('/api/tightness');
  const wages = useApi<WagesResponse>('/api/wages', { geo: 'Canada', ...RANGE });

  const findings: Finding[] = [];

  const youth = latest(demographics.data?.by_age['15 to 24 years']);
  const core = latest(demographics.data?.by_age['25 to 54 years']);
  if (youth !== null && core !== null) {
    findings.push({
      value: pct(youth),
      label: 'Youth unemployment',
      detail: `${(youth / core).toFixed(1)}× the ${pct(core)} rate for workers aged 25 to 54.`,
      href: '#who',
    });
  }

  const toronto = latest(cities.data?.cities['Toronto']?.estimate);
  const canada = latest(cities.data?.regions['Canada']);
  if (toronto !== null && canada !== null) {
    findings.push({
      value: pct(toronto),
      label: 'Toronto unemployment',
      detail: `${signed(toronto - canada)} points ${toronto >= canada ? 'above' : 'below'} the national rate of ${pct(canada)}.`,
      href: '#cities',
    });
  }

  const national = tightness.data?.provinces.find((p) => p.geography === 'Canada');
  if (national && tightness.data?.month) {
    findings.push({
      value: national.unemployed_per_vacancy.toFixed(1),
      label: 'Unemployed people per job vacancy',
      detail: `Across Canada in ${formatMonth(tightness.data.month)}, with ${national.vacancies.toLocaleString('en-CA')} open positions.`,
      href: '#tightness',
    });
  }

  const i = (wages.data?.labels.length ?? 0) - 1;
  if (wages.data && i >= 0) {
    const real = wages.data.real_wage_growth[i];
    findings.push({
      value: `${signed(real)} pts`,
      label: 'Real wage growth',
      detail: `Weekly earnings ${signed(wages.data.wage_growth[i])}% against inflation of ${pct(wages.data.inflation[i])} (${formatMonth(wages.data.labels[i])}).`,
      href: '#wages',
    });
  }

  if (findings.length === 0) return null;

  return (
    <section aria-labelledby="key-findings">
      <h2 id="key-findings" className="text-sm font-medium text-accent">Key findings</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {findings.map((f) => <FindingCard key={f.label} {...f} />)}
      </div>
    </section>
  );
}
