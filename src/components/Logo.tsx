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
      <path
        d="M9 8.5h10.5a1.5 1.5 0 0 1 1.5 1.5V23a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 23V10a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="var(--accent-soft, #faf7f2)"
        stroke="var(--text, #1f1c1a)"
        strokeOpacity="0.14"
      />
      <path
        d="M19.5 8.5V11h2.5"
        stroke="var(--accent-muted, #e6e1d8)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 14h7M10.5 17h5.5M10.5 20h7"
        stroke="var(--text, #1f1c1a)"
        strokeOpacity="0.45"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="22.5" r="4.25" fill="var(--accent-ink, #4a4540)" fillOpacity="0.9" />
      <path
        d="M22.5 20.25v2.25l1.5 1"
        stroke="var(--accent, #fffef9)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
