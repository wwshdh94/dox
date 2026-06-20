import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { formatINR, formatDate } from '@/lib/format';
import { useVaultStore } from '@/store/useVaultStore';
import { docsForAsset } from '@/lib/docTags';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const assets = useVaultStore((s) => s.assets);
  const allDocuments = useVaultStore((s) => s.documents);
  const asset = useMemo(() => assets.find((a) => a.id === id), [assets, id]);
  const documents = useMemo(
    () => (id ? docsForAsset(allDocuments, id) : []),
    [allDocuments, id],
  );
  const members = useVaultStore((s) => s.members);
  const navigate = useNavigate();

  if (!asset) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Asset" backFallback="/assets" />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">Asset not found</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const pf = asset.purchaseFields;
  const owner = members.find((m) => m.id === asset.ownedByMemberId);

  return (
    <div className="min-h-full pb-28">
      <Header title={asset.label} backFallback="/assets" />
      <main className="page-main animate-fade-up space-y-4">
        {pf && (
          <section className="surface-panel space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Amount</span>
              <span className="font-medium">{formatINR(pf.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Purchased</span>
              <span>{formatDate(pf.purchaseDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Store</span>
              <span>{pf.storeName}</span>
            </div>
            {pf.storePhone && (
              <a href={`tel:${pf.storePhone}`} className="block text-accent-ink">
                📞 {pf.storePhone}
              </a>
            )}
            {pf.storeEmail && (
              <a href={`mailto:${pf.storeEmail}`} className="block text-accent-ink">
                ✉️ {pf.storeEmail}
              </a>
            )}
            {pf.warrantyUntil && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted">Warranty</span>
                <ExpiryChip date={pf.warrantyUntil} />
              </div>
            )}
            {owner && <p className="text-xs text-muted">Owned by {owner.displayName}</p>}
          </section>
        )}

        <p className="text-sm font-medium">Documents</p>
        {documents.map((d) => (
          <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
            <div className="flex justify-between">
              <span>{d.title}</span>
              <ExpiryChip date={d.expiryDate} />
            </div>
          </Card>
        ))}

      </main>
      <BottomNav />
    </div>
  );
}
