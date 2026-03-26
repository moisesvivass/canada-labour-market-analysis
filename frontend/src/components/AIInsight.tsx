import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  const [summary, setSummary] = useState<string | null>(null);
  const [full, setFull] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setFull(null);
    setExpanded(false);

    try {
      const data = await fetchApi<InsightResponse>('/api/insights', {
        chart,
        geo,
        year_from: yearFrom,
        year_to: yearTo,
      });

      const parts = data.insight.split('[MORE]');
      setSummary(parts[0]?.trim() ?? data.insight);
      if (parts[1]) setFull(parts[1].trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [chart, geo, yearFrom, yearTo]);

  return (
    <div className="mt-4 rounded-lg border border-[#1e2d45] bg-[#0d1117] p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void analyze()}
          disabled={loading}
        >
          {loading ? 'Analyzing…' : 'Analyze with AI'}
        </Button>
        {error && (
          <span className="font-mono text-xs text-red-400">{error}</span>
        )}
      </div>

      {loading && (
        <p className="mt-3 font-mono text-xs text-[#8892a4] animate-pulse">
          Generating insights…
        </p>
      )}

      {!loading && summary && (
        <div className="mt-3 space-y-2">
          <p className="font-mono text-sm leading-relaxed text-[#8892a4]">
            {summary}
          </p>

          {full && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-mono text-xs text-[#4f8ef7] hover:underline"
            >
              Read full analysis ↓
            </button>
          )}

          {full && expanded && (
            <>
              <p className="font-mono text-sm leading-relaxed text-[#8892a4]">
                {full}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="font-mono text-xs text-[#4f8ef7] hover:underline"
              >
                Collapse ↑
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
