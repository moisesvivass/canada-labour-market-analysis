const LINK = 'text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line py-10 text-sm text-muted">
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <p className="font-medium text-ink">About the data</p>
          <p className="mt-2 max-w-md leading-relaxed">
            Monthly, seasonally adjusted estimates from the{' '}
            <a className={LINK} href="https://www150.statcan.gc.ca/n1/en/surveys/3701" target="_blank" rel="noreferrer">
              Statistics Canada Labour Force Survey
            </a>{' '}
            and the{' '}
            <a className={LINK} href="https://www.bankofcanada.ca/valet/docs" target="_blank" rel="noreferrer">
              Bank of Canada Valet API
            </a>
            , refreshed automatically after each release.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-medium text-ink">Built by Moises Vivas</p>
          <p className="mt-2">Data and analytics tools · Python · SQL · React</p>
          <p className="mt-3 flex gap-4 sm:justify-end">
            <a className={LINK} href="https://github.com/moisesvivass/canada-labour-market-analysis" target="_blank" rel="noreferrer">
              Source code
            </a>
            <a className={LINK} href="https://linkedin.com/in/moisesvivas" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
