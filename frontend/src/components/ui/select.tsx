import { cn } from '@/lib/utils';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ className, label, id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="font-mono text-xs text-[#8892a4] uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'rounded border border-[#1e2d45] bg-[#0d1117] px-3 py-1.5 font-mono text-sm text-[#e8edf5] focus:border-[#4f8ef7] focus:outline-none',
          className
        )}
        {...props}
      />
    </div>
  );
}
