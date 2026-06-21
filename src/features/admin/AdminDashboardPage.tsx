import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { AdminDesktopDashboard } from '@/features/admin/AdminDesktopDashboard';
import { AdminLayout } from '@/features/admin/AdminLayout';
import { AdminMobileStats } from '@/features/admin/AdminMobileStats';
import { useAdminSnapshot } from '@/features/admin/adminUi';
import { adminLogout, isAdminAuthenticated, isAdminOwnerEmail } from '@/lib/adminAuth';
import { clearAdminEvents } from '@/lib/adminEvents';
import {
  seedDemoPlatformHouseholds,
  syncPlatformHouseholdFromVault,
} from '@/lib/adminPlatformRegistry';
import { formatDate } from '@/lib/format';
import { useVaultStore } from '@/store/useVaultStore';

export function AdminDashboardPage() {
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const assets = useVaultStore((s) => s.assets);
  const bundles = useVaultStore((s) => s.bundles);
  const tempLinks = useVaultStore((s) => s.tempLinks);
  const syncPlatformMetrics = useVaultStore((s) => s.syncPlatformMetrics);
  const setUserPlan = useVaultStore((s) => s.setUserPlan);

  const snapshot = useAdminSnapshot();
  void refreshKey;

  if (!isAdminAuthenticated(user?.email)) {
    if (user?.email && !isAdminOwnerEmail(user.email)) {
      adminLogout();
    }
    return <Navigate to="/admin" replace />;
  }

  const refresh = () => {
    syncPlatformMetrics();
    setRefreshKey((k) => k + 1);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prevault-platform-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySnapshot = async () => {
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout
      title="Platform dashboard"
      subtitle={`Updated ${formatDate(snapshot.generatedAt)}`}
    >
      <div className="mb-5 flex flex-wrap gap-2 lg:justify-end">
        <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs lg:hidden" onClick={refresh}>
          Refresh
        </Button>
        <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={exportJson}>
          Export JSON
        </Button>
        <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={copySnapshot}>
          {copied ? 'Copied' : 'Copy snapshot'}
        </Button>
      </div>

      <AdminMobileStats snapshot={snapshot} />

      <AdminDesktopDashboard
        snapshot={snapshot}
        currentUserId={user?.id}
        onRefresh={refresh}
        onPlanChange={setUserPlan}
        onClearEvents={() => {
          clearAdminEvents();
          refresh();
        }}
        onSeedDemo={() => {
          seedDemoPlatformHouseholds();
          refresh();
        }}
        onSyncVault={() => {
          if (user) {
            syncPlatformHouseholdFromVault({
              user,
              members,
              documents,
              assets,
              bundles,
              tempLinks,
            });
            refresh();
          }
        }}
        showSeedDemo={snapshot.households.length === 0}
      />
    </AdminLayout>
  );
}
