import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { AdminBroadcastPanel } from '@/features/admin/AdminBroadcastPanel';
import { AdminFeedbackPanel } from '@/features/admin/AdminFeedbackPanel';
import { AdminHouseholdActions } from '@/features/admin/AdminHouseholdActions';
import { countOpenFeedback } from '@/features/admin/adminFeedbackOps';
import { isHouseholdBlocked } from '@/features/admin/adminModerationOps';
import type { PlatformAdminSnapshot } from '@/lib/adminAnalytics';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';
import { StatCard, TrendChart } from '@/features/admin/adminUi';

type SortKey = 'updated' | 'documents' | 'members' | 'email';

export function AdminDesktopDashboard({
  snapshot,
  currentUserId,
  onRefresh,
  onClearEvents,
  onSeedDemo,
  onSyncVault,
  onPlanChange,
  showSeedDemo,
}: {
  snapshot: PlatformAdminSnapshot;
  currentUserId?: string | null;
  onRefresh: () => void;
  onClearEvents: () => void;
  onSeedDemo: () => void;
  onSyncVault: () => void;
  onPlanChange: (plan: User['plan']) => void;
  showSeedDemo: boolean;
}) {
  const { totals, plans, households, recentEvents, referralStats } = snapshot;
  const openFeedback = countOpenFeedback();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');

  const filteredHouseholds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? households.filter(
          (h) =>
            h.email.toLowerCase().includes(q) ||
            h.name.toLowerCase().includes(q) ||
            h.userId.toLowerCase().includes(q) ||
            h.plan.toLowerCase().includes(q),
        )
      : households;

    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'documents':
          return b.documentCount - a.documentCount;
        case 'members':
          return b.memberCount - a.memberCount;
        case 'email':
          return a.email.localeCompare(b.email);
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [households, search, sortKey]);

  const handleClearEvents = () => {
    if (!window.confirm('Clear all platform event logs? This cannot be undone.')) return;
    onClearEvents();
  };

  return (
    <div className="hidden space-y-6 lg:block">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Platform-wide metrics across all registered households on this device.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="ghost" className="!min-h-9 px-3 py-2 text-xs" onClick={handleClearEvents}>
            Clear events
          </Button>
        </div>
      </div>

      {(totals.householdsAtCap > 0 || totals.limitEvents > 0 || openFeedback > 0) && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {totals.householdsAtCap} household(s) at member document cap · {totals.limitEvents} limit
          alert(s) logged
          {openFeedback > 0 ? ` · ${openFeedback} open feedback thread(s)` : ''}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Households" value={totals.households} hint="Registered vault owners" />
        <StatCard label="Members" value={totals.totalMembers} />
        <StatCard
          label="Documents"
          value={totals.totalDocuments}
          hint={`${totals.pendingDocuments} pending review`}
          tone="accent"
        />
        <StatCard label="Verified docs" value={totals.verifiedDocuments} />
        <StatCard label="Assets" value={totals.totalAssets} />
        <StatCard label="Bundles" value={totals.totalBundles} />
        <StatCard label="Active temp links" value={totals.activeTempLinks} />
        <StatCard
          label="At cap"
          value={totals.householdsAtCap}
          hint={`${totals.limitEvents} limit alerts`}
          tone={totals.householdsAtCap > 0 ? 'warning' : 'default'}
        />
      </div>

      <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <p className="section-label">Plans</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl bg-bg-subtle px-3 py-4">
            <p className="text-2xl font-semibold">{plans.free}</p>
            <p className="text-xs text-muted">Free</p>
          </div>
          <div className="rounded-xl bg-bg-subtle px-3 py-4">
            <p className="text-2xl font-semibold">{plans.pro}</p>
            <p className="text-xs text-muted">Pro</p>
          </div>
          <div className="rounded-xl bg-bg-subtle px-3 py-4">
            <p className="text-2xl font-semibold">{plans.family}</p>
            <p className="text-xs text-muted">Family</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <p className="section-label">Referrals</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="text-2xl font-semibold">{referralStats.totalReferralCodes}</p>
            <p className="text-xs text-muted">Codes</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{referralStats.totalSuccessfulReferrals}</p>
            <p className="text-xs text-muted">Successful</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{referralStats.totalBonusDocsGranted}</p>
            <p className="text-xs text-muted">Bonus docs</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart title="New signups (14 days)" points={snapshot.signupTrend} />
        <TrendChart
          title="Platform events (14 days)"
          points={snapshot.activityTrend}
          colorClass="bg-success"
        />
      </div>

      <AdminBroadcastPanel onComplete={onRefresh} />

      <AdminFeedbackPanel onComplete={onRefresh} />

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="section-label">All households</p>
            <p className="mt-0.5 text-xs text-muted">{filteredHouseholds.length} shown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showSeedDemo && (
              <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={onSeedDemo}>
                Load demo data
              </Button>
            )}
            <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={onSyncVault}>
              Sync current vault
            </Button>
          </div>
        </div>

        <div className="border-b border-border-soft px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, id, plan…"
              className="min-h-10 min-w-[12rem] flex-1 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="min-h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            >
              <option value="updated">Last updated</option>
              <option value="documents">Most documents</option>
              <option value="members">Most members</option>
              <option value="email">Email A–Z</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Household</th>
                <th className="px-4 py-2 font-semibold">Plan</th>
                <th className="px-4 py-2 font-semibold">Docs</th>
                <th className="px-4 py-2 font-semibold">Members</th>
                <th className="px-4 py-2 font-semibold">At cap</th>
                <th className="px-4 py-2 font-semibold">Updated</th>
                <th className="px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredHouseholds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    No households match your search.
                  </td>
                </tr>
              ) : (
                filteredHouseholds.map((h) => (
                  <tr key={h.userId}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-text">
                        {h.name}
                        {isHouseholdBlocked(h) ? (
                          <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-danger">
                            Blocked
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">{h.email}</p>
                    </td>
                    <td className="px-4 py-2.5 capitalize">{h.plan}</td>
                    <td className="px-4 py-2.5">
                      {h.documentCount}
                      {h.pendingDocuments > 0 && (
                        <span className="ml-1 text-xs text-warning">({h.pendingDocuments} pending)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{h.memberCount}</td>
                    <td className="px-4 py-2.5">
                      {h.membersAtCap > 0 ? (
                        <span className="font-semibold text-danger">{h.membersAtCap} member(s)</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{formatDate(h.updatedAt)}</td>
                    <td className="px-4 py-2.5">
                      <AdminHouseholdActions
                        household={h}
                        currentUserId={currentUserId}
                        onPlanChange={onPlanChange}
                        onActionComplete={onRefresh}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <p className="section-label">Recent platform events</p>
        {recentEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No platform events logged yet.</p>
        ) : (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
            {recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-bg-subtle px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize text-text">{event.type.replace(/_/g, ' ')}</p>
                  {(event.memberName || event.householdEmail) && (
                    <p className="text-xs text-muted">
                      {[event.memberName, event.householdEmail].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-muted">{formatDate(event.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[0.65rem] leading-relaxed text-muted">
        Demo registry aggregates households in localStorage. Production replaces this with Supabase admin
        views across all users.
      </p>
    </div>
  );
}
