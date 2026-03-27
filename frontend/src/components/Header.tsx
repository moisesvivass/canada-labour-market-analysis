import { useApi } from '@/hooks/useApi';
import type { SummaryResponse } from '@/types/api';

interface HeaderProps {
  onFilterProvince: (province: string) => void;
}

export function Header({ onFilterProvince }: HeaderProps) {
  const { data, loading, error } = useApi<SummaryResponse>('/api/summary');

  const jobsLabel =
    data?.jobs_lost === null
      ? 'N/A'
      : `${(data?.jobs_lost ?? 0) > 0 ? '+' : ''}${data?.jobs_lost}K`;

  const delta = data?.monthly_delta ?? null;
  const deltaLabel =
    delta === null ? null : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}`;
  const deltaColor = delta !== null && delta > 0 ? 'text-red-400' : 'text-emerald-400';

  return (
    <header className="border-b border-[#1e2d45] px-6 py-8">
      <h1
        className="mb-1 text-3xl font-extrabold tracking-tight text-[#e8edf5]"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Canada Labour Market
      </h1>
      <p className="mb-6 font-mono text-sm text-[#8892a4]">
        {data ? `Latest data: ${data.most_recent_month}` : '\u00a0'}
      </p>

      {error && (
        <p className="mb-4 font-mono text-xs text-red-400">
          Failed to load summary: {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Canada Unemployment */}
        <button
          type="button"
          onClick={() => onFilterProvince('Canada')}
          className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4 text-left transition-colors hover:border-[#4f8ef7]"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Canada Unemployment
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p
              className="font-bold text-3xl text-[#4f8ef7]"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {loading ? '—' : error ? 'N/A' : `${data!.canada_rate}%`}
            </p>
            {!loading && !error && deltaLabel && (
              <span className={`font-mono text-sm font-bold ${deltaColor}`}>
                {deltaLabel}
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Click to filter chart</p>
        </button>

        {/* Employment Rate */}
        <div className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Employment Rate
          </p>
          <p
            className="mt-1 font-bold text-3xl text-[#10b981]"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {loading ? '—' : error ? 'N/A' : data!.employment_rate !== null ? `${data!.employment_rate}%` : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Canada · latest month</p>
        </div>

        {/* Participation Rate */}
        <div className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Participation Rate
          </p>
          <p
            className="mt-1 font-bold text-3xl text-[#06b6d4]"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {loading ? '—' : error ? 'N/A' : data!.participation_rate !== null ? `${data!.participation_rate}%` : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Canada · latest month</p>
        </div>

        {/* Highest Province */}
        <button
          type="button"
          onClick={() => data && onFilterProvince(data.worst_province.name)}
          className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4 text-left transition-colors hover:border-[#fb7185]"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Highest Province
          </p>
          <p
            className="mt-1 font-bold text-3xl text-[#fb7185]"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {loading ? '—' : error ? 'N/A' : `${data!.worst_province.rate}%`}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">
            {loading ? '\u00a0' : error ? '' : data!.worst_province.name}
          </p>
        </button>

        {/* Jobs Change */}
        <div className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Jobs Change
          </p>
          <p
            className="mt-1 font-bold text-3xl text-[#f59e0b]"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {loading ? '—' : error ? 'N/A' : jobsLabel}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Month-over-month net jobs</p>
        </div>

        {/* Inflation (CPI YoY) */}
        <div className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Inflation (CPI)
          </p>
          <p
            className="mt-1 font-bold text-3xl text-[#a78bfa]"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {loading
              ? '—'
              : error
              ? 'N/A'
              : data!.cpi_yoy !== null
              ? `${data!.cpi_yoy > 0 ? '+' : ''}${data!.cpi_yoy.toFixed(1)}%`
              : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Year-over-year</p>
        </div>
      </div>
    </header>
  );
}
