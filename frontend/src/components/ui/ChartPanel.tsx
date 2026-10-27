import type { ReactNode } from 'react';

interface ChartPanelProps {
  id: string;
  title: string;
  /** One-sentence takeaway computed from the data; shown under the title. */
  finding: string | null;
  controls: ReactNode;
  loading: boolean;
  error: string | null;
  height: number;
  source: string;
  insight: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
}

export function ChartPanel({
  id,
  title,
  finding,
  controls,
  loading,
  error,
  height,
  source,
  insight,
  legend,
  children,
}: ChartPanelProps) {
  return (
    <section id={id} className="rounded-xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1.5 min-h-6 max-w-3xl text-[15px] leading-relaxed text-muted">
        {finding ?? (loading ? <span className="skeleton inline-block h-4 w-72 max-w-full rounded" /> : ' ')}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">{controls}</div>

      {legend && <div className="mt-5">{legend}</div>}

      <div className="relative mt-5" style={{ height }}>
        {loading ? (
          <div className="skeleton absolute inset-0 rounded-lg" aria-label="Loading chart" />
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-center">
            <p className="text-sm font-medium text-ink">This chart couldn’t load.</p>
            <p className="text-xs text-subtle">The data service may be waking up — try refreshing in a moment.</p>
          </div>
        ) : (
          children
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs text-subtle">Source: {source}</p>
        {insight}
      </div>
    </section>
  );
}
