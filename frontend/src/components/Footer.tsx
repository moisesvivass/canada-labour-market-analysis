import { ExternalLink } from '@/components/ui/ExternalLink';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line py-10 text-sm text-muted">
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <p className="font-medium text-ink">About the data</p>
          <p className="mt-2 max-w-md leading-relaxed">
            Monthly, seasonally adjusted estimates from the{' '}
            <ExternalLink href="https://www150.statcan.gc.ca/n1/en/surveys/3701">
              Statistics Canada Labour Force Survey
            </ExternalLink>{' '}
            and the{' '}
            <ExternalLink href="https://www.bankofcanada.ca/valet/docs">
              Bank of Canada Valet API
            </ExternalLink>
            , refreshed automatically after each release.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-medium text-ink">Built by Moises Vivas</p>
          <p className="mt-2">Data and analytics tools · Python · SQL · React</p>
          <p className="mt-3 flex gap-4 sm:justify-end">
            <ExternalLink href="https://github.com/moisesvivass/canada-labour-market-analysis">
              Source code
            </ExternalLink>
            <ExternalLink href="https://linkedin.com/in/moisesvivas">
              LinkedIn
            </ExternalLink>
          </p>
        </div>
      </div>
    </footer>
  );
}
