import { useEffect, useState } from 'react';

const TOKENS = [
  'ink',
  'muted',
  'subtle',
  'border',
  'grid',
  'context',
  'surface',
  'accent',
  'negative',
] as const;

export type ChartTheme = Record<(typeof TOKENS)[number], string>;

// Chart.js draws on canvas and can't resolve CSS variables, so read the
// design tokens from index.css once per color-scheme change.
function readTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    TOKENS.map((t) => [t, styles.getPropertyValue(`--${t}`).trim()])
  ) as ChartTheme;
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(readTheme());
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return theme;
}
