import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useVaultStore } from '@/store/useVaultStore';
import { bundleShareUrl } from '@/lib/bundleShare';
import { bundleShareDurationHours, formatShareDuration } from '@/lib/planLimits';

function activityLabel(event: string, meta: Record<string, string | number | boolean>): string {
  switch (event) {
    case 'bundle_shared':
      return `Shared with ${meta.sharedWith ?? 'recipient'} · ${meta.purpose ?? ''}`;
    case 'bundle_link_accessed':
      return `Link opened (view #${meta.viewCount ?? '?'})`;
    case 'bundle_printed':
      return 'Printed via secure link';
    case 'bundle_link_revoked':
      return 'Share link revoked';
    case 'bundle_created':
      return 'Bundle created';
    case 'bundle_updated':
      return 'Bundle updated';
    default:
      return event.replace(/_/g, ' ');
  }
}

export function BundleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bundles = useVaultStore((s) => s.bundles);
  const user = useVaultStore((s) => s.user);
  const documents = useVaultStore((s) => s.documents);
  const activities = useVaultStore((s) => s.activities);
  const bundleShareLinks = useVaultStore((s) => s.bundleShareLinks);
  const createBundleShareLink = useVaultStore((s) => s.createBundleShareLink);
  const revokeBundleShareLink = useVaultStore((s) => s.revokeBundleShareLink);
  const deleteBundle = useVaultStore((s) => s.deleteBundle);
  const navigate = useNavigate();

  const bundle = useMemo(() => bundles.find((b) => b.id === id), [bundles, id]);
  const bundleDocs = useMemo(
    () => (bundle ? documents.filter((d) => bundle.documentIds.includes(d.id)) : []),
    [bundle, documents],
  );
  const activeLinks = useMemo(
    () => bundleShareLinks.filter((l) => l.bundleId === id && l.status === 'active'),
    [bundleShareLinks, id],
  );
  const bundleActivities = useMemo(
    () => activities.filter((a) => a.bundleId === id),
    [activities, id],
  );

  const [shareOpen, setShareOpen] = useState(false);
  const [sharedWith, setSharedWith] = useState('');
  const [sharePurpose, setSharePurpose] = useState('');
  const [watermark, setWatermark] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const bundleShareHours = bundleShareDurationHours(user);

  if (!bundle) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Bundle" backFallback="/bundles" />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">Bundle not found.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleShare = () => {
    const link = createBundleShareLink(bundle.id, {
      sharedWith: sharedWith.trim() || undefined,
      purpose: sharePurpose.trim() || bundle.purpose,
      watermark,
    });
    setShareUrl(bundleShareUrl(link.token));
    setShareOpen(true);
  };

  return (
    <div className="min-h-full pb-28">
      <Header title={bundle.name} backFallback="/bundles" />
      <main className="page-main animate-fade-up space-y-4">
        <div className="surface-panel p-4 text-sm">
          <p className="font-medium">{bundle.purpose}</p>
          <p className="mt-1 text-muted">{bundleDocs.length} documents in this bundle</p>
        </div>

        <section className="space-y-2">
          <p className="section-label">Documents</p>
          {bundleDocs.map((d) => (
            <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
              <p className="font-medium">{d.title}</p>
              <p className="text-xs text-muted">{d.docType.replace(/_/g, ' ')}</p>
            </Card>
          ))}
        </section>

        <section className="surface-panel space-y-3 p-4">
          <p className="section-label">Share bundle</p>
          <Input
            label="Shared with (optional)"
            value={sharedWith}
            onChange={(e) => setSharedWith(e.target.value)}
            placeholder="e.g. Apollo Hospital, Star Health"
          />
          <Input
            label="Purpose on link"
            value={sharePurpose || bundle.purpose}
            onChange={(e) => setSharePurpose(e.target.value)}
          />
          <Select
            label="Watermark"
            value={watermark ? 'yes' : 'no'}
            onChange={(e) => setWatermark(e.target.value === 'yes')}
          >
            <option value="yes">Include date + purpose watermark</option>
            <option value="no">No watermark</option>
          </Select>
          <Button className="w-full" onClick={handleShare}>
            Create temp share link ({formatShareDuration(bundleShareHours)})
          </Button>
        </section>

        {activeLinks.length > 0 && (
          <section className="text-sm">
            <p className="font-medium text-muted">Active links</p>
            {activeLinks.map((l) => (
              <div key={l.id} className="mt-2 flex items-center justify-between rounded-xl bg-bg px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs">/p/{l.token.slice(0, 8)}…</p>
                  {l.sharedWith && <p className="text-xs text-muted">For {l.sharedWith}</p>}
                </div>
                <Button variant="ghost" className="text-xs" onClick={() => revokeBundleShareLink(l.id)}>
                  Revoke
                </Button>
              </div>
            ))}
          </section>
        )}

        <section>
          <p className="mb-2 text-sm font-medium text-muted">Share activity</p>
          {bundleActivities.length === 0 && (
            <p className="text-xs text-muted">No activity yet. Create a share link to start logging.</p>
          )}
          <ul className="space-y-1 text-xs text-muted">
            {bundleActivities.slice(0, 15).map((a) => (
              <li key={a.id}>
                {activityLabel(a.event, a.metadata)} · {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>

        <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
          Delete bundle
        </Button>
      </main>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share bundle">
        <p className="mb-2 text-sm text-muted">
          Link expires in 1 hour. Recipient can view and print only — no download.
        </p>
        <p className="break-all rounded-xl bg-bg p-2 text-xs">{shareUrl}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button className="w-full" onClick={() => void navigator.clipboard.writeText(shareUrl)}>
            Copy link
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => window.open(`${shareUrl}?print=1`, '_blank', 'noopener,noreferrer')}
          >
            Open print view
          </Button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete bundle?">
        <p className="mb-4 text-sm text-muted">Documents stay in your vault. Active share links will stop working.</p>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            deleteBundle(bundle.id);
            navigate('/bundles');
          }}
        >
          Delete bundle
        </Button>
      </Modal>
      <BottomNav />
    </div>
  );
}
