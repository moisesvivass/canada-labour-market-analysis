import { useState, useCallback, useEffect } from 'react';
import { fetchApi } from '@/hooks/useApi';
import type { InsightResponse } from '@/types/api';

interface AIInsightProps {
  chart: string;
  geos: string;
  yearFrom: string;
  yearTo: string;
}

export function AIInsight({ chart, geos, yearFrom, yearTo }: AIInsightProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Dedicated geos watcher — resets on every province selection change
  useEffect(() => {
    setSummary(null);
    setDetail(null);
    setError(null);
    setOpen(false);
    setExpanded(false);
  }, [geos]);

  // Reset on chart type or year range changes too
  useEffect(() => {
    setSummary(null);
    setDetail(null);
    setError(null);
    setOpen(false);
    setExpanded(false);
  }, [chart, yearFrom, yearTo]);

  const handleClick = useCallback(async () => {
    if (open) {
      setOpen(false);
      setExpanded(false);
      return;
    }
    setOpen(true);
    if (summary) return; // already fetched, just re-open

    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<InsightResponse>('/api/insights', {
        chart,
        geos,
        year_from: yearFrom,
        year_to: yearTo,
      });
      const parts = data.insight.split(/\s*\[MORE\]\s*/);
      setSummary(parts[0].trim());
      setDetail(parts[1]?.trim() ?? '');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [chart, geos, yearFrom, yearTo, open, summary]);

  const geoLabel = geos
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="absolute right-5 top-5 rounded border border-[#1e2d45] bg-[#0d1117] px-3 py-1 font-mono text-xs text-[#4f8ef7] transition-colors hover:border-[#4f8ef7] disabled:opacity-50"
      >
        {loading ? 'Analyzing…' : open ? 'AI Insights ↑' : 'AI Insights ↓'}
      </button>

      <div
        style={{
          maxHeight: open ? '900px' : '0',
          opacity: open ? 1 : 0,
          overflow: open ? 'visible' : 'hidden',
          marginTop: open ? '1rem' : '0',
          transition: 'max-height 0.3s ease, opacity 0.25s ease, margin-top 0.25s ease',
        }}
      >
        <div className="rounded-lg border border-[#1e2d45] bg-[#0d1117] p-4">
          {/* Panel header */}
          {(summary || loading) && (
            <p className="mb-3 font-mono text-xs text-[#4f8ef7]">
              Analyzing: {geoLabel} · {yearFrom}–{yearTo}
            </p>
          )}

          {loading && (
            <p className="animate-pulse text-sm text-[#8892a4]">
              Generating insights…
            </p>
          )}

          {error && (
            <p className="text-sm text-[#fb7185]">{error}</p>
          )}

          {!loading && summary && (
            <div>
              <p className="text-sm leading-relaxed text-[#c9d1d9]">
                {summary}
              </p>

              {detail && (
                <>
                  <div
                    style={{
                      maxHeight: expanded ? '600px' : '0',
                      overflowY: expanded ? 'auto' : 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <p className="mt-3 border-t border-[#1e2d45] pt-3 text-sm leading-relaxed text-[#c9d1d9]">
                      {detail}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-3 text-xs text-[#4f8ef7] hover:underline"
                  >
                    {expanded ? 'Show less ↑' : 'Read more ↓'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
