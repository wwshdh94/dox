import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetCard } from '@/components/AssetCard';
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
            <div className="grid grid-cols-2 gap-3">
              {vehicles.map((a) => {
                const docs = documents.filter((d) => !d.archivedAt && d.assetId === a.id && isAssetsDomainDoc(d));
                const { valid, total } = vehicleValidity(docs);
                const allValid = valid === total;
                return (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    title={a.label}
                    subtitle={`${valid} of ${total} docs valid`}
                    status={{
                      label: allValid ? 'All valid' : 'Needs attention',
                      tone: allValid ? 'success' : 'warning',
                    }}
                    onClick={() => navigate(`/assets/${a.id}`)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {purchases.length > 0 && (
          <section className="space-y-3">
            <p className="section-label">Purchases</p>
            <div className="grid grid-cols-2 gap-3">
              {purchases.map((a) => {
                const pf = a.purchaseFields;
                const ownerMember = members.find((m) => m.id === a.ownedByMemberId);
                const subtitle = [
                  pf ? formatINR(pf.amount) : null,
                  pf?.storeName,
                  ownerMember?.displayName,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    title={pf?.productName ?? a.label}
                    subtitle={subtitle || undefined}
                    expiryDate={pf?.warrantyUntil}
                    onClick={() => navigate(`/assets/${a.id}`)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {other.length > 0 && (
          <section className="space-y-3">
            <p className="section-label">Other assets</p>
            <div className="grid grid-cols-2 gap-3">
              {other.map((a) => (
                <AssetCard
                  key={a.id}
                  asset={a}
                  title={a.label}
                  onClick={() => navigate(`/assets/${a.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {assets.length === 0 && (
          <p className="text-center text-sm text-muted">
            No assets yet. Tap + to add a vehicle, appliance, or purchase receipt.
          </p>
        )}
      </main>
      <BottomNav />
      <HomeFab context="assets" />
    </div>
  );
}
