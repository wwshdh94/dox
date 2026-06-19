import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DocumentFilePreview } from '@/components/DocumentFilePreview';
import { DocTagChips } from '@/components/DocTagChips';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useVaultStore } from '@/store/useVaultStore';
import { formatDate } from '@/lib/format';
import { documentBackPath } from '@/lib/navigation';
import {
  canCreateTempLink,
  formatShareDuration,
  tempLinkDurationHours,
} from '@/lib/planLimits';
import { UpgradeHint } from '@/components/UpgradeHint';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const allDocuments = useVaultStore((s) => s.documents);
  const allActivities = useVaultStore((s) => s.activities);
  const allTempLinks = useVaultStore((s) => s.tempLinks);
  const user = useVaultStore((s) => s.user);
  const doc = useMemo(() => allDocuments.find((d) => d.id === id), [allDocuments, id]);
  const activities = useMemo(
    () => allActivities.filter((a) => a.documentId === id),
    [allActivities, id],
  );
  const members = useVaultStore((s) => s.members);
  const tempLinks = useMemo(
    () => allTempLinks.filter((l) => l.documentId === id && l.status === 'active'),
    [allTempLinks, id],
  );
  const updateDocument = useVaultStore((s) => s.updateDocument);
  const deleteDocument = useVaultStore((s) => s.deleteDocument);
  const markRenewed = useVaultStore((s) => s.markRenewed);
  const createTempLink = useVaultStore((s) => s.createTempLink);
  const revokeTempLink = useVaultStore((s) => s.revokeTempLink);
  const addShareGrant = useVaultStore((s) => s.addShareGrant);
  const viewedRef = useRef<string | null>(null);
  const [notes, setNotes] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const navigate = useNavigate();

  const activeTempCount = allTempLinks.filter((l) => l.status === 'active').length;
  const shareHours = tempLinkDurationHours(user);
  const canShare = canCreateTempLink(user, activeTempCount);

  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    useVaultStore.getState().logActivity('viewed', {}, id);
  }, [id]);

  useEffect(() => {
    if (doc) setNotes(doc.notes ?? '');
  }, [doc?.id]);

  if (!doc) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Document" backFallback="/" />
        <main className="page-main">
          <p className="text-sm text-muted">Document not found</p>
        </main>
      </div>
    );
  }

  const backTo = documentBackPath(doc);

  const handleTempShare = () => {
    setShareError('');
    const link = createTempLink(doc.id);
    if (!link) {
      setShareError('Temp share limit reached on your plan.');
      return;
    }
    const url = `${window.location.origin}/v/${link.token}`;
    setQrUrl(url);
    setShareOpen(true);
  };

  return (
    <div className="min-h-full pb-28">
      <Header title={doc.title} backFallback={backTo} />
      <main className="page-main animate-fade-up space-y-4">
        <DocumentFilePreview fileName={doc.fileName} fileDataUrl={doc.fileDataUrl} />

        <DocTagChips doc={doc} />

        {doc.verificationStatus === 'pending' && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
            <p className="font-medium">Awaiting verification</p>
            <p className="mt-1 text-xs text-muted">
              Confirm extracted fields to add this document to your vault.
            </p>
            <Link
              to={`/upload?verify=${doc.id}`}
              className="mt-2 inline-block text-xs font-medium text-accent-ink"
            >
              Complete verification →
            </Link>
          </div>
        )}

        <div className="surface-panel space-y-1 p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-accent-ink">Encrypted</p>
          {doc.expiryDate && (
            <p className="mt-2">Expires {formatDate(doc.expiryDate)}</p>
          )}
          {Object.entries(doc.fields).map(([k, v]) => (
            <p key={k} className="mt-1">
              <span className="text-muted">{k}: </span>{String(v)}
            </p>
          ))}
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (doc.notes ?? '')) {
              updateDocument(doc.id, { notes });
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleTempShare} disabled={!canShare}>
            Temp share ({formatShareDuration(shareHours)})
          </Button>
          <Button variant="secondary" onClick={() => markRenewed(doc.id)}>
            Mark renewed
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const viewer = members.find((m) => m.role === 'viewer');
              if (viewer) addShareGrant(doc.id, viewer.id);
            }}
          >
            Share with family
          </Button>
        </div>

        {shareError && <p className="text-sm text-danger">{shareError}</p>}
        {!canShare && (
          <UpgradeHint message="Free plan allows 2 active temp links. Pro extends link duration to 24 hours." />
        )}

        {tempLinks.length > 0 && (
          <section className="text-sm">
            <p className="font-medium text-muted">Active links</p>
            {tempLinks.map((l) => (
              <div key={l.id} className="mt-2 flex items-center justify-between rounded-xl bg-bg px-3 py-2">
                <span className="truncate text-xs">/v/{l.token.slice(0, 8)}…</span>
                <Button variant="ghost" className="text-xs" onClick={() => revokeTempLink(l.id)}>
                  Revoke
                </Button>
              </div>
            ))}
          </section>
        )}

        <section>
          <p className="mb-2 text-sm font-medium text-muted">Activity</p>
          <ul className="space-y-1 text-xs text-muted">
            {activities.slice(0, 8).map((a) => (
              <li key={a.id}>{a.event} · {new Date(a.createdAt).toLocaleString()}</li>
            ))}
          </ul>
        </section>

        <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
          Delete document
        </Button>
      </main>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete document?">
        <p className="mb-4 text-sm text-muted">This cannot be undone. All shares and temp links will be removed.</p>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            deleteDocument(doc.id);
            navigate(backTo);
          }}
        >
          Delete permanently
        </Button>
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share nearby">
        <p className="mb-2 text-sm text-muted">Show this QR or send the link. Expires in 1 hour.</p>
        <p className="break-all rounded-xl bg-bg p-2 text-xs">{qrUrl}</p>
        <Button className="mt-3 w-full" onClick={() => void navigator.clipboard.writeText(qrUrl)}>
          Copy link
        </Button>
      </Modal>
      <BottomNav />
    </div>
  );
}
