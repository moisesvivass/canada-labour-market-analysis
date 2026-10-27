import { cn } from '@/lib/utils';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: string[];
}

export function Select({ className, label, id, options, ...props }: SelectProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-subtle">{label}</span>
      <select
        id={id}
        className={cn(
          'h-8 rounded-md border border-line bg-surface pl-2.5 pr-7 text-sm text-ink transition-colors hover:border-subtle focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
