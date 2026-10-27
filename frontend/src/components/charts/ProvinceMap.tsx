import { useMemo, useState } from 'react';
import { geoConicConformal, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import provinces from '@/assets/canada-provinces.json';
import { useApi } from '@/hooks/useApi';
import type { ProvincesLatestResponse, RegionLatest } from '@/types/api';
import { SOURCES } from '@/lib/attribution';
import { formatMonth, pct, signed } from '@/lib/format';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

// Boundaries: Natural Earth admin-1 (public domain), simplified by scripts/build_canada_map.py.
const MAP = provinces as FeatureCollection<MultiPolygon, { name: string }>;
const WIDTH = 760;
const HEIGHT = 560;
// The territories have no monthly LFS data, so the map is framed on the provinces;
// the territories still show, cropped, for geographic context.
const TERRITORIES = new Set(['Yukon', 'Northwest Territories', 'Nunavut']);
const PROVINCES_ONLY = { ...MAP, features: MAP.features.filter((f) => !TERRITORIES.has(f.properties.name)) };
// Lambert conformal conic, the projection Statistics Canada uses for national maps.
const projection = geoConicConformal().parallels([49, 77]).rotate([96, 0]).fitSize([WIDTH, HEIGHT], PROVINCES_ONLY);
const path = geoPath(projection);
// The projection never changes, so each outline is computed once.
const OUTLINES = MAP.features.map((f) => ({ name: f.properties.name, d: path(f) ?? undefined }));

type Metric = 'rate' | 'change';

// Sequential blues for the level; diverging (orange = worse, blue = better) for the change.
const RATE_STEPS = ['#dbe4f6', '#b3c5ec', '#7f9fdc', '#4f78c8', '#1d4ed8'];
const CHANGE_STEPS = ['#1d4ed8', '#7f9fdc', '#e7e4dc', '#f0a978', '#c2410c'];

function fillFor(region: RegionLatest | undefined, metric: Metric, min: number, max: number): string {
  if (!region) return 'var(--context)';
  if (metric === 'rate') {
    const t = (region.rate - min) / (max - min || 1);
    return RATE_STEPS[Math.min(RATE_STEPS.length - 1, Math.floor(t * RATE_STEPS.length))];
  }
  const change = region.change ?? 0;
  if (Math.abs(change) < 0.15) return CHANGE_STEPS[2];
  if (change < 0) return change <= -1 ? CHANGE_STEPS[0] : CHANGE_STEPS[1];
  return change >= 1 ? CHANGE_STEPS[4] : CHANGE_STEPS[3];
}

function mapFinding(data: ProvincesLatestResponse): string | null {
  const provincesOnly = data.regions.filter((r) => r.geography !== 'Canada');
  if (!provincesOnly.length || !data.month) return null;
  const highest = provincesOnly[0];
  const lowest = provincesOnly[provincesOnly.length - 1];
  const rising = provincesOnly.filter((r) => (r.change ?? 0) >= 0.15).length;
  return `In ${formatMonth(data.month)}, unemployment ranged from ${pct(lowest.rate)} in ${lowest.geography} to ${pct(highest.rate)} in ${highest.geography}; ${rising} of 10 provinces are higher than a year ago.`;
}

interface ProvinceMapProps {
  onSelect: (province: string) => void;
}

export function ProvinceMap({ onSelect }: ProvinceMapProps) {
  const { data, loading, error } = useApi<ProvincesLatestResponse>('/api/provinces/latest');
  const [metric, setMetric] = useState<Metric>('rate');
  const [hovered, setHovered] = useState<string | null>(null);

  const byName = useMemo(() => new Map(data?.regions.map((r) => [r.geography, r]) ?? []), [data]);
  const provincesOnly = data?.regions.filter((r) => r.geography !== 'Canada') ?? [];
  const rates = provincesOnly.map((r) => r.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const focus = hovered ? byName.get(hovered) : byName.get('Canada');

  const toggle = (
    <SegmentedControl
      label="Map metric"
      options={[{ value: 'rate', label: 'Unemployment rate' }, { value: 'change', label: 'Change vs a year ago' }]}
      value={metric}
      onChange={setMetric}
    />
  );

  return (
    <ChartPanel
      id="where"
      title="Where unemployment is highest"
      finding={data ? mapFinding(data) : null}
      loading={loading}
      error={error}
      sources={[SOURCES.lfs]}
      referenceMonth={data?.month}
      controls={toggle}
      exportable={false}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full overflow-hidden" role="img" aria-label="Map of Canada by unemployment rate">
          {OUTLINES.map(({ name, d }) => {
            const region = byName.get(name);
            return (
              <path
                key={name}
                d={d}
                fill={fillFor(region, metric, min, max)}
                stroke="var(--surface)"
                strokeWidth={hovered === name ? 2.5 : 1}
                className={region ? 'cursor-pointer transition-opacity hover:opacity-85' : ''}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => region && onSelect(name)}
              >
                <title>{region ? `${name}: ${pct(region.rate)}` : `${name}: not covered by the monthly LFS`}</title>
              </path>
            );
          })}
        </svg>

        <div className="flex flex-col justify-between gap-4 text-sm">
          <div className="rounded-lg bg-bg p-4">
            <p className="text-xs font-medium text-subtle">{hovered ?? 'Canada'}</p>
            {focus ? (
              <>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{pct(focus.rate)}</p>
                <p className="mt-1 text-xs text-muted">
                  {focus.year_ago !== null ? `${signed(focus.change ?? 0)} pts vs ${pct(focus.year_ago)} a year ago` : ' '}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted">Territories are not covered by the monthly Labour Force Survey.</p>
            )}
          </div>
          <ol className="space-y-1">
            {provincesOnly.map((r) => (
              <li key={r.geography}>
                <button
                  type="button"
                  onClick={() => onSelect(r.geography)}
                  onMouseEnter={() => setHovered(r.geography)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex w-full justify-between rounded px-1.5 py-0.5 text-left text-xs text-muted hover:bg-bg hover:text-ink"
                >
                  <span>{r.geography}</span>
                  <span className="tabular-nums text-ink">{pct(r.rate)}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-subtle">Click a province to see its trend. Boundaries: Natural Earth.</p>
        </div>
      </div>
    </ChartPanel>
  );
}
