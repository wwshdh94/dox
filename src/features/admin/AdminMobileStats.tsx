import type { PlatformAdminSnapshot } from '@/lib/adminAnalytics';
import { StatCard } from '@/features/admin/adminUi';

export function AdminMobileStats({ snapshot }: { snapshot: PlatformAdminSnapshot }) {
  const { totals, plans } = snapshot;

  return (
    <div className="space-y-4 lg:hidden">
      <p className="text-sm text-muted">
        Mobile view shows key platform totals. Open on desktop for household tables, trends, and event logs.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Households" value={totals.households} />
        <StatCard label="Members" value={totals.totalMembers} />
        <StatCard label="Documents" value={totals.totalDocuments} tone="accent" />
        <StatCard label="Verified" value={totals.verifiedDocuments} />
        <StatCard label="Pending review" value={totals.pendingDocuments} tone="warning" />
        <StatCard label="Assets" value={totals.totalAssets} />
        <StatCard label="Bundles" value={totals.totalBundles} />
        <StatCard label="Temp links" value={totals.activeTempLinks} />
      </div>

      <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <p className="section-label">Plans</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-bg-subtle px-2 py-3">
            <p className="text-lg font-semibold">{plans.free}</p>
            <p className="text-xs text-muted">Free</p>
          </div>
          <div className="rounded-xl bg-bg-subtle px-2 py-3">
            <p className="text-lg font-semibold">{plans.pro}</p>
            <p className="text-xs text-muted">Pro</p>
          </div>
          <div className="rounded-xl bg-bg-subtle px-2 py-3">
            <p className="text-lg font-semibold">{plans.family}</p>
            <p className="text-xs text-muted">Family</p>
          </div>
        </div>
      </section>
    </div>
  );
}
