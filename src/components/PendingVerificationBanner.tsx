import { Link } from 'react-router-dom';
import { getDocumentsNeedingReview } from '@/lib/documentReview';
import { useVaultStore } from '@/store/useVaultStore';

export function PendingVerificationBanner({ memberId }: { memberId?: string }) {
  const documents = useVaultStore((s) => s.documents);
  const pending = getDocumentsNeedingReview(documents).filter(
    (d) => !memberId || d.memberId === memberId,
  );

  if (pending.length === 0) return null;

  const first = pending[0]!;

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <p className="font-medium text-text">
        {pending.length} document{pending.length === 1 ? '' : 's'} under review
      </p>
      <p className="mt-1 text-xs text-muted">
        Open a document and mark it reviewed after checking extracted details.
      </p>
      <Link
        to={`/documents/${first.id}`}
        className="mt-2 inline-block text-xs font-medium text-accent-ink"
      >
        Review now →
      </Link>
    </div>
  );
}
