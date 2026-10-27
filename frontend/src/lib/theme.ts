import { useState } from 'react';

const TOKENS = [
  'bg',
  'ink',
  'muted',
  'subtle',
  'border',
  'grid',
  'context',
  'surface',
  'accent',
  'positive',
  'negative',
] as const;

export type ChartTheme = Record<(typeof TOKENS)[number], string>;

// Chart.js draws on canvas and can't resolve CSS variables, so read the
// design tokens from index.css once on mount.
function readTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    TOKENS.map((t) => [t, styles.getPropertyValue(`--${t}`).trim()])
  ) as ChartTheme;
}

export function useChartTheme(): ChartTheme {
  const [theme] = useState(readTheme);
  return theme;
}
