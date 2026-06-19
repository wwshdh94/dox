import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { useStoreHydration } from '@/hooks/useStoreHydration';
import { debug } from '@/lib/debug';

export function AppLayout() {
  const hydrated = useStoreHydration();
  const user = useVaultStore((s) => s.user);
  const touchMemberActivity = useVaultStore((s) => s.touchMemberActivity);
  const onboardingComplete = useVaultStore((s) => s.settings.onboardingComplete);
  const location = useLocation();

  useEffect(() => {
    if (hydrated && user) {
      touchMemberActivity();
    }
  }, [hydrated, user?.id, touchMemberActivity]);

  const isPublic =
    location.pathname === '/login' ||
    location.pathname.startsWith('/c/') ||
    location.pathname.startsWith('/v/') ||
    location.pathname.startsWith('/p/');

  debug('AppLayout', 'render', {
    hydrated,
    path: location.pathname,
    hasUser: !!user,
    onboardingComplete: onboardingComplete,
  });

  if (!hydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="flex gap-1.5">
          <span className="loading-dot h-2 w-2 rounded-full bg-accent-ink" />
          <span className="loading-dot h-2 w-2 rounded-full bg-accent-ink [animation-delay:0.2s]" />
          <span className="loading-dot h-2 w-2 rounded-full bg-accent-ink [animation-delay:0.4s]" />
        </div>
        <p className="text-sm text-muted">Loading Dox…</p>
      </div>
    );
  }

  if (!user && !isPublic) {
    debug('AppLayout', 'redirect → /login');
    return <Navigate to="/login" replace />;
  }

  if (user && !onboardingComplete && location.pathname !== '/onboarding') {
    debug('AppLayout', 'redirect → /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  if (user && location.pathname === '/login') {
    debug('AppLayout', 'redirect → /');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
