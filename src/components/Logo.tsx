type LogoSize = 'sm' | 'md' | 'lg';

const sizes: Record<LogoSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export function Logo({ size = 'md', className = '' }: { size?: LogoSize; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${sizes[size]} ${className}`}
    >
      <rect width="32" height="32" rx="9" fill="var(--accent, #fffef9)" stroke="var(--accent-muted, #e6e1d8)" />
      <path d="M 9 12 L 16 15.5 L 23 12 L 16 8.5 Z" fill="var(--accent-muted, #e6e1d8)" />
      <path d="M 9 12 L 16 15.5 L 16 24.5 L 9 21 Z" fill="var(--accent-ink, #4a4540)" />
      <path d="M 16 15.5 L 23 12 L 23 21 L 16 24.5 Z" fill="var(--text, #1f1c1a)" />
      <path
        d="M 16 5.5 L 20 7.5 L 21 9 L 15 12 L 9 9 Z"
        fill="var(--surface-elevated, #ffffff)"
        stroke="var(--accent-muted, #e6e1d8)"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path d="M 20 7.5 L 19 8 L 21 9 Z" fill="var(--muted, #6f6760)" />
      <path
        d="M 11.5 8.75 L 15.5 10.75 M 13.5 7.75 L 17.5 9.75 M 12.5 10.25 L 14.5 11.25"
        stroke="var(--accent-ink, #4a4540)"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
