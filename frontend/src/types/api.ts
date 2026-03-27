export interface SummaryResponse {
  most_recent_month: string;
  canada_rate: number;
  employment_rate: number | null;
  participation_rate: number | null;
  monthly_delta: number | null;
  worst_province: {
    name: string;
    rate: number;
  };
  jobs_lost: number | null;
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
}

export interface InsightResponse {
  insight: string;
}
