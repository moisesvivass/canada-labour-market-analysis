import { useApi } from '@/hooks/useApi';
import type { NewsItem } from '@/types/api';
import { formatDay } from '@/lib/format';
import { ExternalLink } from '@/components/ui/ExternalLink';

/** The latest official explanation of the numbers: StatCan's own LFS release, quoted with attribution. */
export function WhatMoved() {
  const { data: releases } = useApi<NewsItem[]>('/api/news', { category: 'statcan_release', limit: '10' });
  const { data: decisions } = useApi<NewsItem[]>('/api/news', { category: 'rate_decision', limit: '1' });

  const lfs = releases?.find((r) => r.title.startsWith('Labour Force Survey'));
  const decision = decisions?.[0];
  if (!lfs) return null;

  return (
    <section aria-labelledby="what-moved" className="rounded-xl border border-line bg-surface p-5 sm:p-7">
      <p className="text-sm font-medium text-accent">What moved this month</p>
      <h2 id="what-moved" className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">
        {lfs.title}
      </h2>
      {lfs.summary && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{lfs.summary}</p>}

      {lfs.key_points.length > 0 && (
        <ul className="mt-5 grid gap-x-8 gap-y-2 text-sm text-ink sm:grid-cols-2">
          {lfs.key_points.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {point}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-xs text-subtle sm:flex-row sm:justify-between">
        <p>
          Source: Statistics Canada, The Daily, {formatDay(lfs.published)} —{' '}
          <ExternalLink href={lfs.url}>read the full release</ExternalLink>.
        </p>
        {decision && (
          <p>
            Bank of Canada, {formatDay(decision.published)}:{' '}
            <ExternalLink href={decision.url}>{decision.title}</ExternalLink>
          </p>
        )}
      </div>
    </section>
  );
}
