import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
}

const variants = {
  primary:
    'border border-accent bg-accent text-accent-fg shadow-sm hover:bg-accent-hover hover:shadow-md active:scale-[0.98]',
  secondary:
    'border border-border bg-surface-elevated text-text shadow-sm hover:border-accent-muted hover:bg-accent-soft/40',
  ghost: 'text-muted hover:bg-accent-soft/50 hover:text-text',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-2xl px-5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
