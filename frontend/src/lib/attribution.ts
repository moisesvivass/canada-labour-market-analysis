// Attribution in the exact form each licence asks for. Charts here are adapted
// (filtered, transformed), so StatCan's "Adapted from" wording plus its
// non-endorsement notice applies. See README "Security & Data Handling".

export type Publisher = 'statcan' | 'boc';

export interface SourceRef {
  publisher: Publisher;
  product: string;
}

export const SOURCES = {
  lfs: { publisher: 'statcan', product: 'Labour Force Survey, Table 14-10-0287-01' },
  cities: { publisher: 'statcan', product: 'Labour Force Survey, Table 14-10-0460-01' },
  industries: { publisher: 'statcan', product: 'Labour Force Survey, Table 14-10-0355-01' },
  vacancies: { publisher: 'statcan', product: 'Job Vacancy and Wage Survey, Table 14-10-0432-01' },
  earnings: { publisher: 'statcan', product: 'Survey of Employment, Payrolls and Hours, Table 14-10-0223-01' },
  overnightRate: { publisher: 'boc', product: 'overnight rate target (series V39079)' },
  cpi: { publisher: 'boc', product: 'CPI and core inflation measures (Valet API)' },
} satisfies Record<string, SourceRef>;

/** One line of attribution covering every source a chart uses. */
export function attributionText(sources: SourceRef[], referenceDate?: string): string {
  const statcan = sources.filter((s) => s.publisher === 'statcan').map((s) => s.product);
  const boc = sources.filter((s) => s.publisher === 'boc').map((s) => s.product);
  const parts: string[] = [];
  if (statcan.length) {
    const date = referenceDate ? `, ${referenceDate}` : '';
    parts.push(
      `Adapted from Statistics Canada, ${statcan.join('; ')}${date}. ` +
        'This does not constitute an endorsement by Statistics Canada of this product.'
    );
  }
  if (boc.length) parts.push(`Source: Bank of Canada, ${boc.join('; ')}.`);
  return parts.join(' ');
}
