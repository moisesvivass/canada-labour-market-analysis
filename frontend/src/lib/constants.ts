const YEAR_START = 2006;
const YEAR_END = 2026;
export const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => String(YEAR_START + i));

export const PROVINCE_COLORS: Record<string, string> = {
  Canada: '#4f8ef7',
  Ontario: '#f59e0b',
  Alberta: '#10b981',
  Quebec: '#e879f9',
  'British Columbia': '#06b6d4',
  Manitoba: '#f97316',
  Saskatchewan: '#84cc16',
  'Nova Scotia': '#a78bfa',
  'New Brunswick': '#fb7185',
  'Newfoundland and Labrador': '#34d399',
  'Prince Edward Island': '#fbbf24',
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
