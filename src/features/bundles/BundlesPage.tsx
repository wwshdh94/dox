import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useVaultStore } from '@/store/useVaultStore';
import { canCreateBundle } from '@/lib/planLimits';
import { UpgradeHint } from '@/components/UpgradeHint';

export function BundlesPage() {
  const bundles = useVaultStore((s) => s.bundles);
  const user = useVaultStore((s) => s.user);
  const navigate = useNavigate();
  const canCreate = canCreateBundle(user, bundles.length);

  return (
    <div className="min-h-full pb-28">
      <Header title="Shared bundles" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        <p className="text-sm text-muted">
          Saved document groups for insurance, hospital, KYC, and more. Share with temp links and
          track activity.
        </p>

        <Button className="w-full" disabled={!canCreate} onClick={() => navigate('/bundles/new')}>
          + New shared bundle
        </Button>
        {!canCreate && (
          <UpgradeHint message="Free plan includes 1 shared bundle. Pro unlocks unlimited bundles and longer share links." />
        )}

        {bundles.length === 0 && (
          <p className="text-center text-sm text-muted">No bundles yet. Create one from the + menu or above.</p>
        )}

        {bundles.map((b) => (
          <Card key={b.id} onClick={() => navigate(`/bundles/${b.id}`)}>
            <p className="font-semibold">{b.name}</p>
            <p className="mt-1 text-xs text-muted">
              {b.purpose} · {b.documentIds.length} doc{b.documentIds.length === 1 ? '' : 's'}
            </p>
          </Card>
        ))}

      </main>
      <BottomNav />
    </div>
  );
}
