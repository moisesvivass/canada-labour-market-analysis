const YEAR_START = 2020;
const YEAR_END = new Date().getFullYear();
export const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => String(YEAR_START + i));
export const DEFAULT_YEAR_FROM = String(YEAR_START);
export const DEFAULT_YEAR_TO = String(YEAR_END);

// Muted categorical palette that reads on both light and dark backgrounds.
// Canada is drawn with the theme accent instead (see provinceColor).
const PROVINCE_COLORS: Record<string, string> = {
  Ontario: '#e07b39',
  Quebec: '#8e6bbf',
  'British Columbia': '#2a9d8f',
  Alberta: '#d1495b',
  Manitoba: '#5f8fb4',
  Saskatchewan: '#c9a227',
  'Nova Scotia': '#5b8c5a',
  'New Brunswick': '#b56576',
  'Newfoundland and Labrador': '#9c6644',
  'Prince Edward Island': '#7d8597',
};

export function provinceColor(geo: string, accent: string): string {
  return geo === 'Canada' ? accent : (PROVINCE_COLORS[geo] ?? '#7d8597');
}

export const PROVINCE_LIST = [
  'Canada',
  'Ontario',
  'Alberta',
  'Quebec',
  'British Columbia',
  'Manitoba',
  'Saskatchewan',
  'Nova Scotia',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Prince Edward Island',
];

export const ANNOTATIONS = {
  covid: {
    label: 'COVID peak',
    date: '2020-04',
  },
  tariffs: {
    label: 'US tariffs',
    date: '2025-02',
  },
  jobs: {
    label: '−84K jobs',
    date: '2026-02',
  },
};

export const SECTIONS = [
  { id: 'trend', label: 'Trend' },
  { id: 'year-over-year', label: 'Year over year' },
  { id: 'provinces', label: 'Provinces' },
  { id: 'industries', label: 'Industries' },
  { id: 'rates', label: 'Interest rates' },
];
