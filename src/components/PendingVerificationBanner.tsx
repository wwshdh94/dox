import { Link } from 'react-router-dom';
import { getDocumentsNeedingReview, isDocumentPendingDetails } from '@/lib/documentReview';
import { useVaultStore } from '@/store/useVaultStore';

export function PendingVerificationBanner({ memberId }: { memberId?: string }) {
  const documents = useVaultStore((s) => s.documents);
  const pending = getDocumentsNeedingReview(documents).filter(
    (d) => !memberId || d.memberId === memberId,
  );

  if (pending.length === 0) return null;

  const first = pending[0]!;
  const detailsCount = pending.filter(isDocumentPendingDetails).length;
  const reviewCount = pending.length - detailsCount;

  const title =
    detailsCount > 0 && reviewCount === 0
      ? `${pending.length} document${pending.length === 1 ? '' : 's'} need details`
      : detailsCount > 0
        ? `${pending.length} document${pending.length === 1 ? '' : 's'} need attention`
        : `${pending.length} document${pending.length === 1 ? '' : 's'} under review`;

  const body =
    detailsCount > 0 && reviewCount === 0
      ? 'Open a document and enter field values to finish adding it to your vault.'
      : detailsCount > 0
        ? 'Some uploads need field details; others need extracted details checked.'
        : 'Open a document and mark it reviewed after checking extracted details.';

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <p className="font-medium text-text">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
      <Link
        to={isDocumentPendingDetails(first) ? `/upload?edit=${first.id}` : `/documents/${first.id}`}
        className="mt-2 inline-block text-xs font-medium text-accent-ink"
      >
        Continue →
      </Link>
    </div>
  );
}
