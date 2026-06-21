import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminLayout } from '@/features/admin/AdminLayout';
import { AdminOpsFinanceDashboard } from '@/features/admin/AdminOpsFinanceDashboard';
import { useAdminSnapshot } from '@/features/admin/adminUi';
import { adminLogout, isAdminAuthenticated, isAdminOwnerEmail } from '@/lib/adminAuth';
import { buildOpsFinanceSnapshot } from '@/lib/adminOpsFinanceAnalytics';
import { formatDate } from '@/lib/format';
import { useVaultStore } from '@/store/useVaultStore';

export function AdminOpsFinancePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const user = useVaultStore((s) => s.user);
  const syncPlatformMetrics = useVaultStore((s) => s.syncPlatformMetrics);

  useAdminSnapshot();
  void refreshKey;

  const snapshot = buildOpsFinanceSnapshot();

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

  return (
    <AdminLayout
      title="Ops & Finance"
      subtitle={`Updated ${formatDate(snapshot.generatedAt)}`}
    >
      <AdminOpsFinanceDashboard snapshot={snapshot} onRefresh={refresh} />
    </AdminLayout>
  );
}
