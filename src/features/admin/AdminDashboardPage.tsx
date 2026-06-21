import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { buildPlatformAdminSnapshot } from '@/lib/adminAnalytics';
import { adminLogout, isAdminAuthenticated, isAdminOwnerEmail } from '@/lib/adminAuth';
import { clearAdminEvents } from '@/lib/adminEvents';
import {
  seedDemoPlatformHouseholds,
  syncPlatformHouseholdFromVault,
} from '@/lib/adminPlatformRegistry';
import { formatDate } from '@/lib/format';
import { useVaultStore } from '@/store/useVaultStore';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-accent/70"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="text-[0.55rem] text-muted">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const assets = useVaultStore((s) => s.assets);
  const bundles = useVaultStore((s) => s.bundles);
  const tempLinks = useVaultStore((s) => s.tempLinks);
  const syncPlatformMetrics = useVaultStore((s) => s.syncPlatformMetrics);

  useEffect(() => {
    syncPlatformMetrics();
    setRefreshKey((k) => k + 1);
  }, [syncPlatformMetrics, user?.id, members.length, documents.length, assets.length, bundles.length]);

  const snapshot = useMemo(() => buildPlatformAdminSnapshot(), [refreshKey]);

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

  const logout = () => {
    adminLogout();
    navigate('/admin');
  };

  return (
    <div className="min-h-full pb-8">
      <Header title="Admin" backFallback="/" />
      <main className="page-main animate-fade-up space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl text-text">Platform dashboard</p>
            <p className="text-xs text-muted">
              All households · updated {formatDate(snapshot.generatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={refresh}>
              Refresh
            </Button>
            <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={exportJson}>
              Export JSON
            </Button>
            <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={copySnapshot}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Households" value={snapshot.totals.households} />
          <StatCard
            label="Subscriptions"
            value={`${snapshot.totals.proPlans} Pro`}
            hint={`${snapshot.totals.freePlans} Free`}
          />
          <StatCard
            label="Documents"
            value={snapshot.totals.totalDocuments}
            hint={`${snapshot.totals.pendingDocuments} pending`}
          />
          <StatCard
            label="At cap"
            value={snapshot.totals.householdsAtCap}
            hint={`${snapshot.totals.limitEvents} limit alerts`}
          />
        </div>

        <section className="surface-panel p-4">
          <h2 className="text-sm font-semibold text-text">Platform usage</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Verified docs" value={snapshot.totals.verifiedDocuments} />
            <StatCard label="Members" value={snapshot.totals.totalMembers} />
            <StatCard label="Assets" value={snapshot.totals.totalAssets} />
            <StatCard label="Active links" value={snapshot.totals.activeTempLinks} />
          </div>
        </section>

        <section className="surface-panel p-4">
          <h2 className="text-sm font-semibold text-text">Referrals (platform)</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-2xl font-display text-text">{snapshot.referralStats.totalReferralCodes}</p>
              <p className="text-xs text-muted">Codes</p>
            </div>
            <div>
              <p className="text-2xl font-display text-text">
                {snapshot.referralStats.totalSuccessfulReferrals}
              </p>
              <p className="text-xs text-muted">Successful</p>
            </div>
            <div>
              <p className="text-2xl font-display text-text">
                {snapshot.referralStats.totalBonusDocsGranted}
              </p>
              <p className="text-xs text-muted">Bonus docs</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="surface-panel p-4">
            <h2 className="text-sm font-semibold text-text">New signups (14 days)</h2>
            <div className="mt-4 h-28">
              <TrendChart data={snapshot.signupTrend} />
            </div>
          </section>
          <section className="surface-panel p-4">
            <h2 className="text-sm font-semibold text-text">Platform events (14 days)</h2>
            <div className="mt-4 h-28">
              <TrendChart data={snapshot.activityTrend} />
            </div>
          </section>
        </div>

        <section className="surface-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text">All households</h2>
            <div className="flex flex-wrap gap-2">
              {snapshot.households.length === 0 && (
                <Button
                  variant="secondary"
                  className="!min-h-9 px-3 py-2 text-xs"
                  onClick={() => {
                    seedDemoPlatformHouseholds();
                    refresh();
                  }}
                >
                  Load demo data
                </Button>
              )}
              <Button
                variant="secondary"
                className="!min-h-9 px-3 py-2 text-xs"
                onClick={() => {
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
              >
                Sync current vault
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-bg/50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Household</th>
                  <th className="px-4 py-2 font-semibold">Plan</th>
                  <th className="px-4 py-2 font-semibold">Docs</th>
                  <th className="px-4 py-2 font-semibold">Members</th>
                  <th className="px-4 py-2 font-semibold">At cap</th>
                  <th className="px-4 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {snapshot.households.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-muted">
                      No households registered yet. Users appear here on sign-up and vault sync.
                    </td>
                  </tr>
                ) : (
                  snapshot.households.map((h) => (
                    <tr key={h.userId}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-text">{h.name}</p>
                        <p className="text-xs text-muted">{h.email}</p>
                      </td>
                      <td className="px-4 py-2.5 capitalize">{h.plan}</td>
                      <td className="px-4 py-2.5">
                        {h.documentCount}
                        {h.pendingDocuments > 0 && (
                          <span className="ml-1 text-xs text-muted">({h.pendingDocuments} pending)</span>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text">Recent platform events</h2>
            <Button
              variant="secondary"
              className="!min-h-9 px-3 py-2 text-xs"
              onClick={() => {
                clearAdminEvents();
                refresh();
              }}
            >
              Clear events
            </Button>
          </div>
          <ul className="divide-y divide-border/60 text-sm">
            {snapshot.recentEvents.length === 0 ? (
              <li className="px-4 py-3 text-muted">No platform events logged yet.</li>
            ) : (
              snapshot.recentEvents.map((e) => (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-text">{e.type.replace(/_/g, ' ')}</span>
                    <span className="shrink-0 text-xs text-muted">{formatDate(e.at)}</span>
                  </div>
                  {(e.memberName || e.householdEmail) && (
                    <p className="text-xs text-muted">
                      {[e.memberName, e.householdEmail].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <p className="text-[0.65rem] leading-relaxed text-muted">
          Demo registry aggregates households in localStorage. Production replaces this with Supabase
          admin views across all users.
        </p>
      </main>
    </div>
  );
}
