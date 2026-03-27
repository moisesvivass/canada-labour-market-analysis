import { useState, useCallback, useEffect } from 'react';
import { fetchApi } from '@/hooks/useApi';
import type { InsightResponse } from '@/types/api';

interface AIInsightProps {
  chart: string;
  geo: string;
  yearFrom: string;
  yearTo: string;
}

export function AIInsight({ chart, geo, yearFrom, yearTo }: AIInsightProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Reset when chart parameters change so stale insight is not shown
  useEffect(() => {
    setInsight(null);
    setError(null);
    setOpen(false);
  }, [chart, geo, yearFrom, yearTo]);

  const handleClick = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (insight) return; // already fetched, just re-open

    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<InsightResponse>('/api/insights', {
        chart,
        geo,
        year_from: yearFrom,
        year_to: yearTo,
      });
      setInsight(data.insight.replace('[MORE]', '\n\n'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [chart, geo, yearFrom, yearTo, open, insight]);

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="absolute right-5 top-5 rounded border border-[#1e2d45] bg-[#0d1117] px-3 py-1 font-mono text-xs text-[#4f8ef7] transition-colors hover:border-[#4f8ef7] disabled:opacity-50"
      >
        {loading ? 'Analyzing…' : open ? 'Hide Insights ↑' : 'AI Insights ↓'}
      </button>

      <div
        style={{
          maxHeight: open ? '480px' : '0',
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          marginTop: open ? '1rem' : '0',
          transition: 'max-height 0.3s ease, opacity 0.25s ease, margin-top 0.25s ease',
        }}
      >
        <div className="rounded-lg border border-[#1e2d45] bg-[#0d1117] p-4">
          {loading && (
            <p className="animate-pulse font-mono text-xs text-[#8892a4]">
              Generating insights…
            </p>
          )}
          {error && (
            <p className="font-mono text-xs text-red-400">{error}</p>
          )}
          {!loading && insight && (
            <p className="whitespace-pre-line font-mono text-sm leading-relaxed text-[#c8d0df]">
              {insight}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
