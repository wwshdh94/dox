import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { useStoreHydration } from '@/hooks/useStoreHydration';
import { LoadingScreen } from '@/components/LoadingScreen';
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

  const biometricLockEnabled = useVaultStore((s) => s.settings.biometricLockEnabled);
  const locked = useVaultStore((s) => s.locked);

  debug('AppLayout', 'render', {
    hydrated,
    path: location.pathname,
    hasUser: !!user,
    onboardingComplete: onboardingComplete,
  });

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingScreen label="Loading PreVault…" />
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

  if (
    user &&
    biometricLockEnabled &&
    locked &&
    location.pathname !== '/lock' &&
    !isPublic
  ) {
    return <Navigate to="/lock" replace />;
  }

  if (user && location.pathname === '/login') {
    debug('AppLayout', 'redirect → /');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
