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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Canada rate */}
        <button
          type="button"
          onClick={() => onFilterProvince('Canada')}
          className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4 text-left transition-colors hover:border-[#4f8ef7]"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Canada Unemployment
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-[#4f8ef7]" style={{ fontFamily: 'Syne, sans-serif' }}>
            {loading ? '—' : error ? 'N/A' : `${data!.canada_rate}%`}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Click to filter chart</p>
        </button>

        {/* Worst province */}
        <button
          type="button"
          onClick={() =>
            data && onFilterProvince(data.worst_province.name)
          }
          className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4 text-left transition-colors hover:border-[#fb7185]"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Highest Province
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-[#fb7185]" style={{ fontFamily: 'Syne, sans-serif' }}>
            {loading ? '—' : error ? 'N/A' : `${data!.worst_province.rate}%`}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">
            {loading ? '\u00a0' : error ? '' : data!.worst_province.name}
          </p>
        </button>

        {/* Jobs lost — from API */}
        <div className="rounded-lg border border-[#1e2d45] bg-[#161b27] p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#8892a4]">
            Jobs Change (Latest Month)
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-[#f59e0b]" style={{ fontFamily: 'Syne, sans-serif' }}>
            {loading ? '—' : error ? 'N/A' : jobsLabel}
          </p>
          <p className="mt-1 font-mono text-xs text-[#8892a4]">Month-over-month net jobs</p>
        </div>
      </div>
    </header>
  );
}
