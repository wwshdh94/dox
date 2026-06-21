import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { clearAdminSession, getAdminSession } from '@/lib/adminAuth';

const TABS = [
  { to: '/admin/dashboard', label: 'Platform' },
  { to: '/admin/analytics', label: 'Ops & Finance' },
] as const;

export function AdminLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAdminSession();

  const signOut = () => {
    clearAdminSession();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface-elevated/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">PreVault Admin</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-text sm:text-xl">{title}</h1>
            {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent-soft/50 sm:inline"
            >
              Open app
            </Link>
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        <nav className="border-t border-border-soft px-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl gap-1 py-2">
            {TABS.map((tab) => {
              const active = location.pathname === tab.to;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-accent text-accent-fg'
                      : 'text-muted hover:bg-accent-soft/40 hover:text-text'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {session?.email ? (
          <div className="border-t border-border-soft px-4 py-2 sm:px-6">
            <p className="mx-auto max-w-7xl text-xs text-muted">
              Signed in as <span className="font-medium text-text">{session.email}</span>
            </p>
          </div>
        ) : null}
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">{children}</div>
    </div>
  );
}
