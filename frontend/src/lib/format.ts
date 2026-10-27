const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2024-03" -> "Mar 2024"; anything else is returned unchanged. */
export function formatMonth(label: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(label);
  if (!match) return label;
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

export function signed(value: number, digits = 1): string {
  const fixed = Math.abs(value).toFixed(digits);
  if (Number(fixed) === 0) return fixed;
  return `${value > 0 ? '+' : '−'}${fixed}`;
}

export function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

const DAY = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

/** "2026-10-09" -> "Oct 9, 2026" (noon avoids a time-zone shift to the previous day). */
export function formatDay(iso: string): string {
  return DAY.format(new Date(`${iso.slice(0, 10)}T12:00:00`));
}

/** Percent with one decimal, so 5 reads "5.0%" like the published figures. */
export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** The most recent non-null value of a series (series may end in gaps). */
export function latest(series: (number | null)[] | undefined): number | null {
  if (!series) return null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null) return series[i];
  }
  return null;
}
