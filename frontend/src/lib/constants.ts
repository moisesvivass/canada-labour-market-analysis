const YEAR_START = 2020;
const YEAR_END = new Date().getFullYear();
export const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => String(YEAR_START + i));

export const PROVINCE_COLORS: Record<string, string> = {
  Canada: '#4f8ef7',                       // blue — national anchor
  Ontario: '#f59e0b',                      // amber
  Quebec: '#e879f9',                       // magenta
  'British Columbia': '#06b6d4',           // cyan
  Alberta: '#10b981',                      // emerald green
  Manitoba: '#f97316',                     // orange
  Saskatchewan: '#facc15',                 // yellow
  'Nova Scotia': '#a78bfa',               // purple
  'New Brunswick': '#fb7185',             // pink/rose
  'Newfoundland and Labrador': '#ef4444', // red
  'Prince Edward Island': '#ffffff',      // white
};

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
    label: 'COVID Peak',
    date: '2020-04',
  },
  tariffs: {
    label: 'US Tariffs',
    date: '2025-02',
  },
  jobs: {
    label: '-84K Jobs',
    date: '2026-02',
  },
};
