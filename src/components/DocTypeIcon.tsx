import { docIconSrc, type DocIconSize } from '@/lib/docIcons';
import type { DocCategory, DocType } from '@/types';

const sizeClass: Record<DocIconSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export function DocTypeIcon({
  docType,
  category,
  title,
  size = 'md',
  fill = false,
  compact = false,
  className = '',
  alt = '',
}: {
  docType: DocType;
  category?: DocCategory;
  /** Used to pick a keyword icon for non-standard documents. */
  title?: string;
  size?: DocIconSize;
  /** Stretch to full height of a pill/list row (left rail). */
  fill?: boolean;
  /** ~30% narrower fill rail for compact home pills. */
  compact?: boolean;
  className?: string;
  alt?: string;
}) {
  const src = docIconSrc(docType, category, title);
  const fillWidth = compact ? 'w-[calc(3.5rem*0.91)]' : 'w-[calc(3.5rem*1.3)]';
  const wrapperClass = fill
    ? `inline-flex h-full ${fillWidth} shrink-0 items-center justify-center overflow-hidden rounded-none`
    : `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft/60 ${sizeClass[size]}`;

  return (
    <span className={`${wrapperClass} ${className}`} aria-hidden={!alt}>
      <img
        src={src}
        alt={alt}
        className={
          fill
            ? 'h-full w-full max-h-full max-w-full object-contain object-center p-1'
            : 'h-full w-full object-contain object-center p-0.5'
        }
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
