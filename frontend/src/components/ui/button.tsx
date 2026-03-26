import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded font-mono text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' &&
          'bg-blue-600 text-white hover:bg-blue-500',
        variant === 'outline' &&
          'border border-[#1e2d45] bg-transparent text-[#8892a4] hover:border-[#4f8ef7] hover:text-[#e8edf5]',
        variant === 'ghost' &&
          'bg-transparent text-[#8892a4] hover:bg-[#1a2030] hover:text-[#e8edf5]',
        size === 'sm' && 'h-7 px-3 text-xs',
        size === 'md' && 'h-9 px-4',
        className
      )}
      {...props}
    />
  );
}
