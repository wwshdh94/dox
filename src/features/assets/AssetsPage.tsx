import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { HomeFab } from '@/components/HomeFab';
import { formatINR } from '@/lib/format';
import { isAssetsDomainDoc } from '@/lib/docTags';
import { getOwnerMember } from '@/lib/family';
import { useVaultStore } from '@/store/useVaultStore';

function vehicleValidity(docs: { docType: string; expiryDate?: string; renewedAt?: string }[]) {
  const types = ['vehicle_rc', 'vehicle_puc', 'vehicle_insurance'] as const;
  const now = new Date();
  let valid = 0;
  types.forEach((t) => {
    const d = docs.find((x) => x.docType === t);
    if (d?.expiryDate && !d.renewedAt && new Date(d.expiryDate) >= now) valid++;
  });
  return { valid, total: types.length };
}

export function AssetsPage() {
  const allAssets = useVaultStore((s) => s.assets);
  const documents = useVaultStore((s) => s.documents);
  const allMembers = useVaultStore((s) => s.members);
  const familyHomeView = useVaultStore((s) => s.settings.familyHomeView ?? 'me');
  const navigate = useNavigate();

  const members = useMemo(
    () => allMembers.filter((m) => m.status !== 'disabled'),
    [allMembers],
  );
  const owner = useMemo(() => getOwnerMember(members), [members]);
  const assets = useMemo(() => {
    if (familyHomeView !== 'me' || !owner) return allAssets;
    return allAssets.filter((a) => !a.ownedByMemberId || a.ownedByMemberId === owner.id);
  }, [allAssets, familyHomeView, owner]);

  const vehicles = assets.filter((a) => a.type === 'vehicle');
  const purchases = assets.filter((a) => a.type === 'purchase');
  const other = assets.filter((a) => !['vehicle', 'purchase'].includes(a.type));

  return (
    <div className="min-h-full pb-28">
      <Header />
      <main className="page-main animate-fade-up space-y-6">
        {vehicles.length > 0 && (
          <section className="space-y-3">
            <p className="section-label">Vehicles</p>
            {vehicles.map((a) => {
              const docs = documents.filter((d) => d.assetId === a.id && isAssetsDomainDoc(d));
              const { valid, total } = vehicleValidity(docs);
              return (
                <Card key={a.id} onClick={() => navigate(`/assets/${a.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold tracking-tight">{a.label}</p>
                      <p className="text-xs text-muted">{valid} of {total} valid</p>
                    </div>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${valid === total ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning'}`}>
                      {valid === total ? '✓' : '!'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </section>
        )}

        {purchases.length > 0 && (
          <section className="space-y-3">
            <p className="section-label">Purchases</p>
            {purchases.map((a) => {
              const pf = a.purchaseFields;
              const owner = members.find((m) => m.id === a.ownedByMemberId);
              return (
                <Card key={a.id} onClick={() => navigate(`/assets/${a.id}`)}>
                  <p className="font-semibold tracking-tight">{pf?.productName ?? a.label}</p>
                  {pf && (
                    <p className="text-sm text-accent-ink">{formatINR(pf.amount)}</p>
                  )}
                  <p className="text-xs text-muted">{pf?.storeName}{owner ? ` · ${owner.displayName}` : ''}</p>
                  {pf?.warrantyUntil && (
                    <div className="mt-2">
                      <ExpiryChip date={pf.warrantyUntil} />
                    </div>
                  )}
                </Card>
              );
            })}
          </section>
        )}

        {other.map((a) => (
          <Card key={a.id} onClick={() => navigate(`/assets/${a.id}`)}>
            <p className="font-medium">{a.label}</p>
          </Card>
        ))}

      </main>
      <BottomNav />
      <HomeFab context="assets" />
    </div>
  );
}
