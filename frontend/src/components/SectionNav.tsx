import { SECTIONS } from '@/lib/constants';

export function SectionNav() {
  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a href="#top" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          <span className="hidden sm:inline">Canada Labour Market</span>
        </a>
        <ul className="-mx-1 flex min-w-0 gap-1 overflow-x-auto text-sm [scrollbar-width:none] sm:ml-auto">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
