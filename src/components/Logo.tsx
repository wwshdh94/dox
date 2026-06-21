type LogoVariant = 'mark' | 'full';
type LogoSize = 'sm' | 'md' | 'lg';

const markSizes: Record<LogoSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const fullWidths: Record<LogoSize, string> = {
  sm: 'h-8 w-auto max-w-[9rem]',
  md: 'h-11 w-auto max-w-[12rem]',
  lg: 'h-14 w-auto max-w-[16rem]',
};

export function Logo({
  variant = 'mark',
  size = 'md',
  className = '',
  alt = 'PreVault',
}: {
  /** `mark` = shield only; `full` = shield + wordmark */
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  alt?: string;
}) {
  const src = variant === 'full' ? '/full-logo.png' : '/logo.png';
  const sizeClass = variant === 'full' ? fullWidths[size] : markSizes[size];

  return (
    <img
      src={src}
      alt={alt}
      className={`shrink-0 object-contain ${sizeClass} ${className}`}
      decoding="async"
    />
  );
}
