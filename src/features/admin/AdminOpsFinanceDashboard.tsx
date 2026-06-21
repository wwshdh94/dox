import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { StatCard, TrendChart } from '@/features/admin/adminUi';
import { formatDate } from '@/lib/format';
import {
  formatInr,
  FAMILY_ANNUAL_INR,
  PRO_ANNUAL_INR,
  type OpsFinanceSnapshot,
} from '@/lib/adminOpsFinanceAnalytics';

function PaidMixChart({ points }: { points: OpsFinanceSnapshot['paidMixTrend'] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.pro, p.family]));

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
      <p className="section-label">Paid households (cumulative)</p>
      <div className="mt-4 flex h-36 items-end gap-2">
        {points.map((point) => {
          const proH = `${Math.max(4, (point.pro / max) * 100)}%`;
          const famH = `${Math.max(4, (point.family / max) * 100)}%`;
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div className="w-1/2 max-w-4 rounded-t-md bg-accent" style={{ height: proH }} title={`Pro: ${point.pro}`} />
                <div className="w-1/2 max-w-4 rounded-t-md bg-success" style={{ height: famH }} title={`Family: ${point.family}`} />
              </div>
              <span className="truncate text-[0.65rem] text-muted">
                {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-accent" /> Pro
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-success" /> Family
        </span>
      </div>
    </section>
  );
}

export function AdminOpsFinanceDashboard({
  snapshot,
  onRefresh,
}: {
  snapshot: OpsFinanceSnapshot;
  onRefresh: () => void;
}) {
  const { finance, operations, planMix, eventMix } = snapshot;
  const [copied, setCopied] = useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prevault-ops-finance-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySnapshot = async () => {
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const eventMax = useMemo(() => Math.max(1, ...eventMix.map((e) => e.count)), [eventMix]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Operations health and revenue estimates from platform registry (demo pricing).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={exportJson}>
            Export JSON
          </Button>
          <Button variant="secondary" className="!min-h-9 px-3 py-2 text-xs" onClick={copySnapshot}>
            {copied ? 'Copied' : 'Copy snapshot'}
          </Button>
        </div>
      </div>

      <section>
        <p className="section-label mb-3">Finance</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="MRR (est.)" value={formatInr(finance.mrrInr)} hint={`ARR ${formatInr(finance.arrInr)}`} tone="accent" />
          <StatCard
            label="Paid conversion"
            value={`${finance.conversionRatePct}%`}
            hint={`${finance.paidHouseholds} paid · ${finance.freeHouseholds} free`}
          />
          <StatCard label="ARPU" value={formatInr(finance.arpuInr)} hint="MRR ÷ all households" />
          <StatCard
            label="Discount leakage"
            value={formatInr(finance.discountLeakageInr)}
            hint={`${finance.activeDiscounts} active discount(s)/mo`}
            tone={finance.discountLeakageInr > 0 ? 'warning' : 'default'}
          />
          <StatCard label="Gross MRR" value={formatInr(finance.grossMrrInr)} hint="Before discounts" />
          <StatCard
            label="Referral bonus docs"
            value={finance.referralBonusDocs}
            hint="Free-tier capacity granted"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <p className="section-label">Plan mix (revenue)</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl bg-bg-subtle px-3 py-4">
            <p className="text-2xl font-semibold">{planMix.free}</p>
            <p className="text-xs text-muted">Free</p>
            <p className="mt-1 text-[0.65rem] text-muted">₹0</p>
          </div>
          <div className="rounded-xl bg-bg-subtle px-3 py-4">
            <p className="text-2xl font-semibold">{planMix.pro}</p>
            <p className="text-xs text-muted">Pro</p>
            <p className="mt-1 text-[0.65rem] text-muted">
              {formatInr(Math.round((PRO_ANNUAL_INR / 12) * planMix.pro))}/mo list
            </p>
          </div>
          <div className="rounded-xl bg-bg-subtle px-3 py-4">
            <p className="text-2xl font-semibold">{planMix.family}</p>
            <p className="text-xs text-muted">Family</p>
            <p className="mt-1 text-[0.65rem] text-muted">
              {formatInr(Math.round((FAMILY_ANNUAL_INR / 12) * planMix.family))}/mo list
            </p>
          </div>
        </div>
      </section>

      <section>
        <p className="section-label mb-3">Operations</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active (7d)"
            value={operations.active7d}
            hint={`${operations.active7dPct}% of households`}
            tone="accent"
          />
          <StatCard label="Active (30d)" value={operations.active30d} />
          <StatCard
            label="Open feedback"
            value={operations.openFeedback}
            tone={operations.openFeedback > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Verification backlog"
            value={`${operations.verificationBacklogPct}%`}
            hint="Pending ÷ all docs"
            tone={operations.verificationBacklogPct > 15 ? 'warning' : 'default'}
          />
          <StatCard label="Signups (7d)" value={operations.signups7d} />
          <StatCard label="Upgrades (7d)" value={operations.upgrades7d} tone="accent" />
          <StatCard
            label="Downgrades (7d)"
            value={operations.downgrades7d}
            tone={operations.downgrades7d > 0 ? 'danger' : 'default'}
          />
          <StatCard
            label="Support events (7d)"
            value={operations.supportTickets7d}
            hint="Feedback + admin email"
          />
          <StatCard label="Blocked users" value={operations.blockedUsers} />
          <StatCard
            label="Doc cap alerts"
            value={operations.limitAlerts}
            tone={operations.limitAlerts > 0 ? 'warning' : 'default'}
          />
          <StatCard label="Docs / household" value={operations.docsPerHousehold} />
          <StatCard label="Members / household" value={operations.membersPerHousehold} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart title="New signups (14 days)" points={snapshot.signupTrend} />
        <PaidMixChart points={snapshot.paidMixTrend} />
      </div>

      <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <p className="section-label">Event mix (platform log)</p>
        {eventMix.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No events logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {eventMix.map((row) => (
              <li key={row.type}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-text">{row.label}</span>
                  <span className="font-semibold text-muted">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(4, (row.count / eventMax) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[0.65rem] leading-relaxed text-muted">
        MRR/ARR are demo estimates from plan mix × list price (Pro ₹499/yr, Family ₹799/yr) minus
        active admin discounts. Production wires Razorpay/Stripe + data warehouse for real finance
        reporting. Updated {formatDate(snapshot.generatedAt)}.
      </p>
    </div>
  );
}
