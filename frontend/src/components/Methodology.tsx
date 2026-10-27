import { ExternalLink } from '@/components/ui/ExternalLink';

const SOURCES = [
  { name: 'Labour Force Survey, Table 14-10-0287-01', what: 'Rates by province, age and gender; full- and part-time work', href: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410028701' },
  { name: 'Labour Force Survey, Table 14-10-0460-01', what: 'Toronto, Montréal and Vancouver', href: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046001' },
  { name: 'Labour Force Survey, Table 14-10-0355-01', what: 'Employment by industry', href: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410035501' },
  { name: 'Job Vacancy and Wage Survey, Table 14-10-0432-01', what: 'Job vacancies by province', href: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410043201' },
  { name: 'Survey of Employment, Payrolls and Hours, Table 14-10-0223-01', what: 'Average weekly earnings', href: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410022301' },
  { name: 'Bank of Canada Valet API', what: 'Overnight rate (V39079), CPI and core inflation', href: 'https://www.bankofcanada.ca/valet/docs' },
];

export function Methodology() {
  return (
    <section id="methodology" className="rounded-xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">Methodology and sources</h2>

      <div className="mt-5 grid gap-8 text-sm leading-relaxed text-muted lg:grid-cols-2">
        <div className="space-y-4">
          <p>
            All labour figures are monthly and seasonally adjusted, except where noted. The Labour Force Survey is a
            sample survey, so month-to-month moves of a few tenths of a point can be noise; city estimates are
            shown with a 95% confidence band (±1.96 standard errors) from Statistics Canada’s published standard errors.
          </p>
          <p>
            “Unemployed per vacancy” divides LFS unemployment by JVWS vacancies for the same month. Real wage growth
            is the year-over-year change in average weekly earnings minus CPI inflation. Vacancy and earnings data
            run about two months behind the LFS.
          </p>
          <p>
            Data refreshes automatically several times a month. The “What moved” panel and the policy timeline use
            official announcements only: Statistics Canada’s The Daily, Bank of Canada decisions and federal releases
            on Canada.ca. They provide context, not proof of cause and effect.
          </p>
        </div>

        <div>
          <ul className="space-y-2">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <ExternalLink href={s.href}>{s.name}</ExternalLink>
                <span className="text-subtle"> — {s.what}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-subtle">
            Contains information adapted from Statistics Canada, used under the{' '}
            <ExternalLink href="https://www.statcan.gc.ca/en/reference/licence">Statistics Canada Open Licence</ExternalLink>
            ; this does not constitute an endorsement by Statistics Canada of this product. Bank of Canada data used
            under its{' '}
            <ExternalLink href="https://www.bankofcanada.ca/terms/">terms of use</ExternalLink>.
            Province boundaries from Natural Earth (public domain).
          </p>
        </div>
      </div>
    </section>
  );
}
