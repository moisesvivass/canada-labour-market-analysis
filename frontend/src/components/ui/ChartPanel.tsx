import { useRef, type ReactNode } from 'react';
import { attributionText, type SourceRef } from '@/lib/attribution';
import { chartToCsv, chartToShareImage, downloadBlob } from '@/lib/exportChart';
import { formatMonth } from '@/lib/format';
import { useChartTheme } from '@/lib/theme';

interface ChartPanelProps {
  id: string;
  title: string;
  /** One-sentence takeaway computed from the data; shown under the title. */
  finding: string | null;
  controls?: ReactNode;
  loading: boolean;
  error: string | null;
  /** Fixed chart height in px; omit to let the content (e.g. the map) size itself. */
  height?: number;
  sources: SourceRef[];
  /** Latest month shown ("2026-09"), named in the attribution line. */
  referenceMonth?: string | null;
  insight?: ReactNode;
  legend?: ReactNode;
  /** Chart.js panels can export CSV and a share image; SVG panels (the map) can't. */
  exportable?: boolean;
  children: ReactNode;
}

const ACTION = 'rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-bg hover:text-ink';

export function ChartPanel({
  id,
  title,
  finding,
  controls,
  loading,
  error,
  height,
  sources,
  referenceMonth,
  insight,
  legend,
  exportable = true,
  children,
}: ChartPanelProps) {
  const theme = useChartTheme();
  const chartArea = useRef<HTMLDivElement>(null);
  const attribution = attributionText(sources, referenceMonth ? formatMonth(referenceMonth) : undefined);
  const canvas = () => chartArea.current?.querySelector('canvas') ?? null;

  const downloadCsv = () => {
    const el = canvas();
    const csv = el && chartToCsv(el, attribution);
    if (csv) downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${id}.csv`);
  };

  const downloadImage = async () => {
    const el = canvas();
    const blob = el && (await chartToShareImage({ canvas: el, title, finding, attribution, theme }));
    if (blob) downloadBlob(blob, `${id}.png`);
  };

  const ready = !loading && !error;

  return (
    <section id={id} className="rounded-xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1.5 min-h-6 max-w-3xl text-[15px] leading-relaxed text-muted">
        {finding ?? (loading ? <span className="skeleton inline-block h-4 w-72 max-w-full rounded" /> : ' ')}
      </p>
      {controls && <div className="mt-5 flex flex-wrap gap-3">{controls}</div>}

      {legend && <div className="mt-5">{legend}</div>}

      <div ref={chartArea} className="relative mt-5" style={height ? { height } : { minHeight: 300 }}>
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
        <p className="max-w-2xl text-xs leading-relaxed text-subtle">{attribution}</p>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          {exportable && ready && (
            <div className="flex gap-1">
              <button type="button" onClick={downloadCsv} className={ACTION}>Download CSV</button>
              <button type="button" onClick={() => void downloadImage()} className={ACTION}>Share image</button>
            </div>
          )}
          {insight}
        </div>
      </div>
    </section>
  );
}
