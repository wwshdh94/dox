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
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent, #fffef9)" stroke="var(--accent-muted, #e6e1d8)" strokeWidth="1" />
      <path d="M 8 16 L 16 20 L 24 16 L 16 12 Z" fill="var(--accent-muted, #e6e1d8)" />
      <path d="M 8 16 L 16 20 L 16 26 L 8 22 Z" fill="var(--accent-ink, #4a4540)" />
      <path d="M 16 20 L 24 16 L 24 22 L 16 26 Z" fill="var(--text, #1f1c1a)" />
      <path
        d="M 8 10 L 16 6 L 24 10 L 16 14 Z"
        fill="var(--surface-elevated, #ffffff)"
        stroke="var(--accent-ink, #4a4540)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M 11 11 L 15 9 M 13 12 L 19 9 M 15 13 L 21 10"
        stroke="var(--accent-ink, #4a4540)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
