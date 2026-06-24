import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlanBadge } from '@/components/PlanBadge';
import {
  FREE_ASSET_LIMIT,
  FREE_EXTRA_MEMBER_LIMIT,
  PLAN_FEATURES,
  PRO_BENEFIT_HIGHLIGHTS,
  PRO_PLAN_BULLETS,
  STANDARD_PLAN_BULLETS,
  isProUser,
} from '@/lib/planLimits';
import { countCompletedLaunchTasks, hasEarnedLifetimePro, canAccessLifetimeProProgram } from '@/lib/launchTasks';
import { formatDiscountPrice, getActiveDiscount } from '@/lib/userModeration';
import { getDocumentLimit, remainingUploads } from '@/lib/referrals';
import { countVerifiedDocuments } from '@/lib/verificationQueue';
import { getOtherFamilyMembers } from '@/lib/family';
import { useVaultStore } from '@/store/useVaultStore';

const PRO_LIST_INR = 499;

function PlanCell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === '✓') {
    return <span className="text-success">✓</span>;
  }
  if (value === '—') {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className={highlight ? 'font-medium text-accent-ink' : 'text-text'}>{value}</span>
  );
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearCap = pct >= 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={nearCap ? 'font-semibold text-warning' : 'font-medium text-text'}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={`h-full rounded-full transition-all ${nearCap ? 'bg-warning' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanPage() {
  const user = useVaultStore((s) => s.user);
  const documents = useVaultStore((s) => s.documents);
  const members = useVaultStore((s) => s.members);
  const assets = useVaultStore((s) => s.assets);
  const settings = useVaultStore((s) => s.settings);
  const setUserPlan = useVaultStore((s) => s.setUserPlan);

  if (!user) return null;

  const onPro = isProUser(user);
  const lifetimeEarned = hasEarnedLifetimePro({ user, documents, members, settings });
  const tasksDone = countCompletedLaunchTasks({ user, documents, members, settings });
  const discount = getActiveDiscount(user.id);
  const salePrice = discount ? formatDiscountPrice(PRO_LIST_INR, discount.percentOff) : null;

  const verifiedDocs = countVerifiedDocuments(documents);
  const docLimit = getDocumentLimit(user);
  const docsRemaining = remainingUploads(user, verifiedDocs);
  const memberUsed = getOtherFamilyMembers(members).length;
  const memberLimit = FREE_EXTRA_MEMBER_LIMIT;
  const assetUsed = assets.length;

  return (
    <div className="min-h-full pb-28">
      <Header title="Plans" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        <div className="plan-hero surface-panel-elevated overflow-hidden">
          <div className="profile-hero-accent" aria-hidden />
          <div className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-display text-xl text-text">Your plan</p>
              <p className="mt-1 text-xs text-muted">
                {onPro
                  ? 'Full household vault — backup, cloud AI, and unlimited storage.'
                  : 'Standard covers essentials. Pro unlocks the full family vault.'}
              </p>
            </div>
            <PlanBadge plan={onPro ? 'pro' : 'free'} />
          </div>
          {user.lifetimePro && (
            <p className="border-t border-border-soft px-4 py-2 text-xs font-medium text-success">
              Lifetime Pro — earned via launch tasks
            </p>
          )}
        </div>

        {!onPro && docLimit !== null && (
          <div className="surface-panel space-y-3 p-4">
            <p className="text-xs font-semibold text-text">Standard usage</p>
            <UsageMeter label="Verified documents" used={verifiedDocs} limit={docLimit} />
            <UsageMeter label="Family members (excl. you)" used={memberUsed} limit={memberLimit} />
            <UsageMeter label="Assets" used={assetUsed} limit={FREE_ASSET_LIMIT} />
            {docsRemaining !== null && docsRemaining <= 3 && (
              <p className="text-xs text-warning">
                {docsRemaining === 0
                  ? 'Document limit reached — upgrade to Pro or invite friends for bonus space.'
                  : `Only ${docsRemaining} document slot${docsRemaining === 1 ? '' : 's'} left on Standard.`}
              </p>
            )}
          </div>
        )}

        <section className="grid grid-cols-2 gap-2">
          <div
            className={`surface-panel flex flex-col rounded-2xl border p-3 ${
              !onPro ? 'border-accent-muted ring-1 ring-accent-muted/30' : 'border-border-soft opacity-90'
            }`}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">Standard</p>
            <p className="mt-1 font-display text-lg text-text">Free</p>
            <p className="mt-0.5 text-[0.65rem] text-muted">For getting started</p>
            <ul className="mt-3 flex-1 space-y-1.5">
              {STANDARD_PLAN_BULLETS.map((item) => (
                <li key={item} className="flex gap-1.5 text-[0.65rem] leading-snug text-muted">
                  <span className="text-success">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            {!onPro && (
              <span className="mt-3 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-center text-[0.6rem] font-semibold text-accent-ink">
                Current
              </span>
            )}
          </div>

          <div
            className={`plan-pro-card flex flex-col rounded-2xl border p-3 ${
              onPro ? 'border-[var(--gold-border)] ring-1 ring-[color-mix(in_srgb,var(--gold)_35%,transparent)]' : 'border-[var(--gold-border)]'
            }`}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--gold-dark)] dark:text-[var(--gold-light)]">
              Pro
            </p>
            <p className="mt-1 font-display text-lg text-text">
              {discount && !onPro ? (
                <>
                  <span className="text-sm line-through text-muted">₹{PRO_LIST_INR}</span>{' '}
                  ₹{salePrice}
                </>
              ) : (
                `₹${PRO_LIST_INR}`
              )}
              <span className="text-xs font-normal text-muted">/yr</span>
            </p>
            <p className="mt-0.5 text-[0.65rem] text-muted">Best for families</p>
            <ul className="mt-3 flex-1 space-y-1.5">
              {PRO_PLAN_BULLETS.map((item) => (
                <li key={item} className="flex gap-1.5 text-[0.65rem] leading-snug text-text">
                  <span className="text-[var(--gold-dark)] dark:text-[var(--gold-light)]">★</span>
                  {item}
                </li>
              ))}
            </ul>
            {onPro ? (
              <span className="mt-3 inline-block rounded-full bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] px-2 py-0.5 text-center text-[0.6rem] font-semibold text-[var(--gold-dark)] dark:text-[var(--gold-light)]">
                Current
              </span>
            ) : (
              <span className="mt-3 inline-block rounded-full bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-2 py-0.5 text-center text-[0.6rem] font-semibold text-[var(--gold-dark)] dark:text-[var(--gold-light)]">
                Recommended
              </span>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <p className="section-label px-1">Why Pro</p>
          <div className="grid grid-cols-2 gap-2">
            {PRO_BENEFIT_HIGHLIGHTS.map((benefit) => (
              <div
                key={benefit.id}
                className="surface-panel rounded-xl border border-[color-mix(in_srgb,var(--gold-border)_25%,transparent)] p-3"
              >
                <span className="text-lg" aria-hidden>
                  {benefit.icon}
                </span>
                <p className="mt-1 text-xs font-semibold text-text">{benefit.title}</p>
                <p className="mt-0.5 text-[0.65rem] leading-snug text-muted">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {!user.lifetimePro && canAccessLifetimeProProgram(user) && (
          <Link
            to="/profile/earn-pro"
            className="surface-panel block rounded-xl border border-accent-muted/50 p-4 transition-colors hover:bg-accent-soft/30"
          >
            <p className="font-semibold text-text">Earn Lifetime Pro free</p>
            <p className="mt-1 text-xs text-muted">
              {tasksDone} tasks done — complete launch tasks before billing goes live.
            </p>
            {lifetimeEarned ? (
              <p className="mt-2 text-xs font-medium text-success">You qualify — open tasks to confirm</p>
            ) : null}
          </Link>
        )}

        {discount && !onPro ? (
          <div className="surface-panel rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
            <p className="font-semibold text-success">{discount.label}</p>
            <p className="mt-1 text-xs text-muted">
              Code <span className="font-mono font-semibold text-text">{discount.code}</span> —{' '}
              {discount.percentOff}% off Pro
            </p>
          </div>
        ) : null}

        <section className="surface-panel overflow-hidden rounded-2xl text-sm">
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-2 border-b border-border bg-bg/50 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
            <span>Feature</span>
            <span className="text-center">Standard</span>
            <span className="rounded-md bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-center text-[var(--gold-dark)] dark:text-[var(--gold-light)]">
              Pro
            </span>
          </div>
          {PLAN_FEATURES.map((row) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-2 border-b border-border/60 px-3 py-2 last:border-0 ${
                row.proHighlight ? 'bg-[color-mix(in_srgb,var(--gold)_4%,transparent)]' : ''
              }`}
            >
              <span className="text-xs text-muted">{row.feature}</span>
              <span className="text-center text-[0.65rem]">
                <PlanCell value={row.free} />
              </span>
              <span className="text-center text-[0.65rem]">
                <PlanCell value={row.pro} highlight={row.proHighlight} />
              </span>
            </div>
          ))}
        </section>

        {!onPro ? (
          <Button className="w-full" onClick={() => setUserPlan('pro')}>
            {discount ? `Upgrade to Pro — ₹${salePrice}/yr (demo)` : 'Upgrade to Pro (demo)'}
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setUserPlan('free')}>
            Switch to Standard (demo)
          </Button>
        )}

        <p className="text-[0.65rem] leading-relaxed text-muted">
          Launch cohort: Pro features are on for the first 100 members (50 docs/member cap).{' '}
          {canAccessLifetimeProProgram(user) ? (
            <>
              <Link to="/profile/earn-pro" className="text-accent-ink">
                Earn Lifetime Pro
              </Link>{' '}
              via tasks before Razorpay billing.
            </>
          ) : null}{' '}
          Demo toggle above is for testing limits only.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
