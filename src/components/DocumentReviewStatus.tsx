import { REVIEW_STATUS_LABELS, normalizeReviewStatus } from '@/lib/documentReview';
import type { Document, DocumentReviewStatus } from '@/types';

const STATUS_DOT_STYLES: Record<
  DocumentReviewStatus,
  { dot: string; pulse?: boolean }
> = {
  processing: {
    dot: 'bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.7)]',
    pulse: true,
  },
  under_review: {
    dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.75)]',
    pulse: true,
  },
  reviewed: {
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
  },
  rejected: {
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]',
  },
};

export function DocumentReviewStatus({
  document,
  compact = false,
}: {
  document: Pick<Document, 'reviewStatus' | 'verificationStatus'>;
  compact?: boolean;
}) {
  const status = normalizeReviewStatus(document);
  const styles = STATUS_DOT_STYLES[status];
  const label = REVIEW_STATUS_LABELS[status];

  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={label}
      aria-label={label}
      role="status"
    >
      <span
        className={`rounded-full ${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} ${styles.dot} ${styles.pulse ? 'animate-pulse' : ''}`}
      />
    </span>
  );
}
