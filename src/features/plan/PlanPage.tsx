import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PLAN_FEATURES, isProUser } from '@/lib/planLimits';
import { formatDiscountPrice, getActiveDiscount } from '@/lib/userModeration';
import { useVaultStore } from '@/store/useVaultStore';

const PRO_LIST_INR = 499;

export function PlanPage() {
  const user = useVaultStore((s) => s.user);
  const setUserPlan = useVaultStore((s) => s.setUserPlan);

  if (!user) return null;

  const onPro = isProUser(user);
  const discount = getActiveDiscount(user.id);
  const salePrice = discount ? formatDiscountPrice(PRO_LIST_INR, discount.percentOff) : null;

  return (
    <div className="min-h-full pb-28">
      <Header title="Plans" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <div className="surface-panel-elevated p-5">
          <p className="font-display text-2xl text-text">
            {onPro ? 'Pro' : 'Free'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {onPro
              ? 'Unlimited vault for your whole household.'
              : 'Everything you need to get started — upgrade when you outgrow it.'}
          </p>
          <span className="mt-3 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
            Current plan
          </span>
        </div>

        {discount && !onPro ? (
          <div className="surface-panel border border-success/30 bg-success/10 p-4 text-sm">
            <p className="font-semibold text-success">{discount.label}</p>
            <p className="mt-1 text-muted">
              Code <span className="font-mono font-semibold text-text">{discount.code}</span> —{' '}
              {discount.percentOff}% off Pro
              {salePrice !== null ? (
                <>
                  {' '}
                  (<span className="line-through">₹{PRO_LIST_INR}</span>{' '}
                  <span className="font-semibold text-text">₹{salePrice}</span>/yr demo)
                </>
              ) : null}
            </p>
            {discount.expiresAt ? (
              <p className="mt-1 text-xs text-muted">Valid until {discount.expiresAt}</p>
            ) : null}
          </div>
        ) : null}

        <div className="surface-panel overflow-hidden text-sm">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-border bg-bg/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center">Pro</span>
          </div>
          {PLAN_FEATURES.map((row) => (
            <div
              key={row.feature}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-border/60 px-4 py-2.5 last:border-0"
            >
              <span className="text-muted">{row.feature}</span>
              <span className="text-center text-xs">{row.free}</span>
              <span className="text-center text-xs font-medium text-accent-ink">{row.pro}</span>
            </div>
          ))}
        </div>

        {!onPro ? (
          <Button className="w-full" onClick={() => setUserPlan('pro')}>
            {discount ? `Upgrade to Pro — ₹${salePrice}/yr (demo)` : 'Upgrade to Pro (demo)'}
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setUserPlan('free')}>
            Switch to Free (demo)
          </Button>
        )}

        <p className="text-[0.65rem] leading-relaxed text-muted">
          Pricing and billing will be added before launch. Demo mode lets you toggle plans to test
          limits. Pro shows unlimited verified storage; uploads may be queued until you verify
          extracted details. Referral bonuses may extend free document capacity subject to fair-use
          terms.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
