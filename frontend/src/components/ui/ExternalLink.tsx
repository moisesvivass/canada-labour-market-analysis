import type { ReactNode } from 'react';

/** Link to another site: opens in a new tab without giving it access to this page. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
    >
      {children}
    </a>
  );
}
