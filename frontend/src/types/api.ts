export interface SummaryResponse {
  most_recent_month: string;
  canada_rate: number;
  employment_rate: number | null;
  participation_rate: number | null;
  monthly_delta: number | null;
  cpi_yoy: number | null;
  worst_province: {
    name: string;
    rate: number;
  };
  jobs_lost: number | null;
}

export interface MacroDataPoint {
  month: string;
  value: number;
}

export interface UnemploymentResponse {
  labels: string[];
  [geo: string]: number[] | string[];
}

export interface CompareResponse {
  labels: string[];
  [year: string]: number[] | string[];
}

export interface ProvincialGapResponse {
  labels: string[];
  geo_a: number[];
  geo_b: number[];
}

export interface IndustryResponse {
  industries: string[];
  pct_change: number[];
  base: number[];
  current: number[];
}

export interface InsightResponse {
  insight: string;
}

export type Series = (number | null)[];

export type AgeGroup = '15 to 24 years' | '25 to 54 years' | '55 years and over';
export type GenderGroup = 'Men+' | 'Women+';

export interface DemographicsResponse {
  labels: string[];
  by_age: Record<AgeGroup, Series>;
  by_gender: Record<GenderGroup, Series>;
  part_time_share: Series;
}

export interface CitySeries {
  province: string;
  estimate: Series;
  standard_error: Series;
}

export interface CitiesResponse {
  labels: string[];
  cities: Record<string, CitySeries>;
  regions: Record<string, Series>;
}

export interface ProvinceTightness {
  geography: string;
  vacancies: number;
  vacancy_rate: number;
  unemployed: number;
  unemployed_per_vacancy: number;
}

export interface TightnessResponse {
  month: string | null;
  provinces: ProvinceTightness[];
  canada: { labels: string[]; unemployed_per_vacancy: number[] };
}

export interface RegionLatest {
  geography: string;
  rate: number;
  year_ago: number | null;
  change: number | null;
}

export interface ProvincesLatestResponse {
  month: string | null;
  regions: RegionLatest[];
}

export interface InflationResponse {
  labels: string[];
  target: number;
  headline: Series;
  cpi_trim: Series;
  cpi_median: Series;
  cpi_common: Series;
}

export interface WagesResponse {
  labels: string[];
  weekly_earnings: number[];
  wage_growth: number[];
  inflation: number[];
  real_wage_growth: number[];
}

export type NewsCategory = 'statcan_release' | 'rate_decision' | 'policy';

export interface NewsItem {
  category: NewsCategory;
  source: string;
  title: string;
  url: string;
  published: string;
  summary: string | null;
  key_points: string[];
}

export interface PolicyEvent {
  date: string;
  category: 'rate_decision' | 'policy';
  source: string;
  title: string;
  url: string | null;
}
