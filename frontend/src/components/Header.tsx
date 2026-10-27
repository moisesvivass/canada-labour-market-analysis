import type { ReactNode } from 'react';
import { useApi } from '@/hooks/useApi';
import { signed } from '@/lib/format';
import type { SummaryResponse } from '@/types/api';

interface HeaderProps {
  onFilterProvince: (province: string) => void;
}

function headline(d: SummaryResponse): string {
  const verb = !d.monthly_delta ? 'held at' : d.monthly_delta > 0 ? 'rose to' : 'fell to';
  return `Unemployment ${verb} ${d.canada_rate}% in ${d.most_recent_month}`;
}

function dek(d: SummaryResponse): string {
  const clauses = [
    d.jobs_lost !== null &&
      `the economy ${d.jobs_lost < 0 ? 'lost' : 'added'} ${Math.abs(d.jobs_lost)}K jobs over the month`,
    d.cpi_yoy !== null &&
      `consumer prices are ${d.cpi_yoy < 0 ? 'down' : 'up'} ${Math.abs(d.cpi_yoy).toFixed(1)}% from a year earlier`,
  ].filter(Boolean);
  const rest = clauses.join(', and ');
  const lead = `${d.worst_province.name} has the highest rate at ${d.worst_province.rate}%.`;
  return rest ? `${lead} ${rest.charAt(0).toUpperCase()}${rest.slice(1)}.` : lead;
}

interface StatProps {
  label: string;
  value: string;
  note: ReactNode;
  onClick?: () => void;
}

function Stat({ label, value, note, onClick }: StatProps) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-xs text-subtle">{note}</p>
    </>
  );
  const base = 'bg-surface p-4 text-left sm:p-5';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} transition-colors hover:bg-accent-soft`}>
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
}

export function Header({ onFilterProvince }: HeaderProps) {
  const { data, loading, error } = useApi<SummaryResponse>('/api/summary');

  const value = (v: number | null | undefined, format: (n: number) => string) =>
    loading || error || v === null || v === undefined ? '—' : format(v);

  const delta = data?.monthly_delta ?? null;

  return (
    <header className="pb-10 pt-10 sm:pt-14">
      <p className="text-sm font-medium text-accent">
        Labour Force Survey{data ? ` · ${data.most_recent_month}` : ''}
      </p>

      {data ? (
        <>
          <h1 className="mt-3 max-w-3xl text-balance font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            {headline(data)}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{dek(data)}</p>
        </>
      ) : error ? (
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Canada Labour Market
        </h1>
      ) : (
        <div className="mt-3 space-y-3" aria-label="Loading summary">
          <div className="skeleton h-12 w-full max-w-2xl rounded" />
          <div className="skeleton h-5 w-full max-w-xl rounded" />
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Unemployment rate"
          value={value(data?.canada_rate, (n) => `${n}%`)}
          note={
            delta === null || loading ? (
              'Canada'
            ) : (
              <span className={delta > 0 ? 'text-negative' : delta < 0 ? 'text-positive' : ''}>
                {signed(delta)} pts vs prior month
              </span>
            )
          }
          onClick={() => onFilterProvince('Canada')}
        />
        <Stat
          label="Employment rate"
          value={value(data?.employment_rate, (n) => `${n}%`)}
          note="Share of population 15+"
        />
        <Stat
          label="Participation rate"
          value={value(data?.participation_rate, (n) => `${n}%`)}
          note="Working or looking"
        />
        <Stat
          label="Highest province"
          value={value(data?.worst_province.rate, (n) => `${n}%`)}
          note={data?.worst_province.name ?? ' '}
          onClick={data ? () => onFilterProvince(data.worst_province.name) : undefined}
        />
        <Stat
          label="Jobs, month over month"
          value={value(data?.jobs_lost, (n) => `${signed(n, 0)}K`)}
          note="Net change, Canada"
        />
        <Stat
          label="Inflation (CPI)"
          value={value(data?.cpi_yoy, (n) => `${signed(n)}%`)}
          note="Year over year"
        />
      </div>
    </header>
  );
}
