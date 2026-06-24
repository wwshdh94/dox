import { REVIEW_STATUS_LABELS, normalizeReviewStatus } from '@/lib/documentReview';
import { daysUntil, expiryStatus } from '@/lib/format';
import type { Document } from '@/types';

type StatusLight = {
  label: string;
  dot: string;
  pulse?: boolean;
  textClass?: string;
};

function expiryLabel(date: string): string {
  const days = daysUntil(date);
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 30) return `${days}d left`;
  return 'Valid';
}

/** One priority-ordered status light for review, expiry, and other document issues. */
export function resolveDocumentStatusLight(
  document: Pick<Document, 'reviewStatus' | 'verificationStatus' | 'expiryDate'>,
): StatusLight {
  const review = normalizeReviewStatus(document);
  const expiry = expiryStatus(document.expiryDate);

  if (expiry === 'expired' && document.expiryDate) {
    return {
      label: expiryLabel(document.expiryDate),
      dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]',
      pulse: true,
      textClass: 'text-danger',
    };
  }
  if (review === 'rejected') {
    return {
      label: REVIEW_STATUS_LABELS.rejected,
      dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]',
      textClass: 'text-danger',
    };
  }
  if (expiry === 'expiring' && document.expiryDate) {
    return {
      label: expiryLabel(document.expiryDate),
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)]',
      pulse: true,
      textClass: 'text-warning',
    };
  }
  if (review === 'processing') {
    return {
      label: REVIEW_STATUS_LABELS.processing,
      dot: 'bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.7)]',
      pulse: true,
      textClass: 'text-muted',
    };
  }
  if (review === 'pending_details') {
    return {
      label: REVIEW_STATUS_LABELS.pending_details,
      dot: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.75)]',
      pulse: true,
      textClass: 'text-accent-ink',
    };
  }
  if (review === 'under_review') {
    return {
      label: REVIEW_STATUS_LABELS.under_review,
      dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.75)]',
      pulse: true,
      textClass: 'text-warning',
    };
  }
  return {
    label: REVIEW_STATUS_LABELS.reviewed,
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
    textClass: 'text-success',
  };
}

function collectDocumentIssues(
  document: Pick<Document, 'reviewStatus' | 'verificationStatus' | 'expiryDate'>,
): string[] {
  const review = normalizeReviewStatus(document);
  const expiry = expiryStatus(document.expiryDate);
  const issues: string[] = [];

  if (expiry === 'expired' || expiry === 'expiring') {
    if (document.expiryDate) issues.push(expiryLabel(document.expiryDate));
  }
  if (review === 'rejected') issues.push(REVIEW_STATUS_LABELS.rejected);
  else if (review === 'processing') issues.push(REVIEW_STATUS_LABELS.processing);
  else if (review === 'pending_details') issues.push(REVIEW_STATUS_LABELS.pending_details);
  else if (review === 'under_review') issues.push(REVIEW_STATUS_LABELS.under_review);

  return issues.length > 0 ? issues : [REVIEW_STATUS_LABELS.reviewed];
}

function StatusDot({
  className,
  pulse,
}: {
  className: string;
  pulse?: boolean;
}) {
  return <span className={`rounded-full ${className} ${pulse ? 'animate-pulse' : ''}`} aria-hidden="true" />;
}

export function DocumentReviewStatus({
  document,
  compact = false,
  detailed = false,
}: {
  document: Pick<Document, 'reviewStatus' | 'verificationStatus' | 'expiryDate'>;
  compact?: boolean;
  /** Show text label beside dot (detail page). */
  detailed?: boolean;
}) {
  const light = resolveDocumentStatusLight(document);
  const tooltip = collectDocumentIssues(document).join(' · ');
  const dotSize = compact ? 'h-2 w-2' : 'h-2.5 w-2.5';

  if (!detailed) {
    return (
      <span
        className="inline-flex shrink-0 self-center"
        title={tooltip}
        aria-label={tooltip}
        role="status"
      >
        <StatusDot className={`${dotSize} ${light.dot}`} pulse={light.pulse} />
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm" role="status" aria-label={tooltip} title={tooltip}>
      <StatusDot className={`${dotSize} ${light.dot}`} pulse={light.pulse} />
      <span className={light.textClass ?? 'text-text'}>{light.label}</span>
    </div>
  );
}
