import { Link } from 'react-router-dom';
import { getUnverifiedDocuments } from '@/lib/verificationQueue';
import { useVaultStore } from '@/store/useVaultStore';

export function PendingVerificationBanner() {
  const documents = useVaultStore((s) => s.documents);
  const pending = getUnverifiedDocuments(documents);

  if (pending.length === 0) return null;

  const first = pending[0]!;

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <p className="font-medium text-text">
        {pending.length} document{pending.length === 1 ? '' : 's'} waiting for verification
      </p>
      <p className="mt-1 text-xs text-muted">
        Confirm extracted details before adding more uploads.
      </p>
      <Link
        to={`/upload?verify=${first.id}`}
        className="mt-2 inline-block text-xs font-medium text-accent-ink"
      >
        Verify now →
      </Link>
    </div>
  );
}
