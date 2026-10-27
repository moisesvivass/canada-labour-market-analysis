import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import type { PolicyEvent } from '@/types/api';
import { formatDay } from '@/lib/format';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ExternalLink } from '@/components/ui/ExternalLink';

type Filter = 'all' | PolicyEvent['category'];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rate_decision', label: 'Interest rates' },
  { value: 'policy', label: 'Federal policy' },
];

/** Dated official events next to the data. Context for the charts, not a claim of cause. */
export function PolicyTimeline() {
  const { data, loading, error } = useApi<PolicyEvent[]>('/api/events');
  const [filter, setFilter] = useState<Filter>('all');

  const events = (data ?? []).filter((e) => filter === 'all' || e.category === filter).reverse();

  return (
    <section id="policy" className="rounded-xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">Policy and events</h2>
      <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">
        Official announcements that can move the labour market, from the Bank of Canada and federal departments.
        They give context to the charts above; timing alone doesn’t prove one caused the other.
      </p>

      <div className="mt-5">
        <SegmentedControl label="Filter events" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {loading ? (
        <div className="skeleton mt-5 h-48 rounded-lg" aria-label="Loading events" />
      ) : error ? (
        <p className="mt-5 text-sm text-muted">Events couldn’t load right now.</p>
      ) : (
        <ol className="mt-5 max-h-[420px] space-y-0 overflow-y-auto border-l border-line pl-5">
          {events.map((e) => (
            <li key={`${e.date}-${e.title}`} className="relative pb-4">
              <span
                aria-hidden
                className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ${e.category === 'rate_decision' ? 'bg-accent' : 'bg-ink'}`}
              />
              <p className="text-xs text-subtle">{formatDay(e.date)} · {e.source}</p>
              {e.url ? (
                <p className="text-sm"><ExternalLink href={e.url}>{e.title}</ExternalLink></p>
              ) : (
                <p className="text-sm text-ink">{e.title}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 border-t border-line pt-4 text-xs text-subtle">
        Rate changes are derived from the Bank of Canada’s overnight rate series (V39079). Federal items link to the
        original releases on Canada.ca; their text is not reproduced here.
      </p>
    </section>
  );
}
