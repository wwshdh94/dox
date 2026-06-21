import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { isProUser } from '@/lib/planLimits';
import { useVaultStore } from '@/store/useVaultStore';

function NavRow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="surface-panel flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
    >
      <span>{children}</span>
      <span className="text-muted">→</span>
    </Link>
  );
}

export function ProfilePage() {
  const user = useVaultStore((s) => s.user);
  const signOut = useVaultStore((s) => s.signOut);
  const visitingCard = useVaultStore((s) => s.visitingCard);
  const onPro = isProUser(user ?? null);

  return (
    <div className="min-h-full pb-28">
      <Header title="Profile" backFallback="/" />
      <main className="page-main animate-fade-up space-y-5">
        <div className="surface-panel-elevated p-5">
          <p className="font-display text-2xl text-text">{user?.name}</p>
          <p className="mt-1 text-sm text-muted">{user?.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
              {user?.plan}
            </span>
            {!onPro && (
              <Link to="/profile/plan" className="text-xs font-medium text-accent-ink">
                Compare plans →
              </Link>
            )}
          </div>
        </div>

        <nav className="space-y-2">
          <NavRow to="/profile/family">Family members</NavRow>
          <NavRow to="/profile/plan">{onPro ? 'Your plan' : 'Upgrade to Pro'}</NavRow>
          <NavRow to="/profile/settings">Settings</NavRow>
          <NavRow to="/profile/activity">Activity & shares</NavRow>
          <NavRow to="/profile/security">Security Center</NavRow>
          <NavRow to="/profile/archived">Archived</NavRow>
          <NavRow to="/profile/backup">Backup & restore</NavRow>
          <NavRow to="/profile/referrals">Referrals & rewards</NavRow>
          <NavRow to="/bundles">Shared bundles</NavRow>
          <NavRow to="/profile/visiting-card">
            {visitingCard?.published ? 'My Visiting Card ✓' : 'My Visiting Card'}
          </NavRow>
        </nav>

        <Button variant="secondary" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}
