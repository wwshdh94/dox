import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { useStoreHydration } from '@/hooks/useStoreHydration';
import { LoadingScreen } from '@/components/LoadingScreen';
import { debug } from '@/lib/debug';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { isUserBlocked } from '@/lib/userModeration';

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

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isBlockedRoute = location.pathname === '/blocked';

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

  if (user && !onboardingComplete && location.pathname !== '/onboarding' && !isAdminRoute) {
    debug('AppLayout', 'redirect → /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  const adminSessionOnAdminRoute =
    Boolean(user) && isAdminRoute && isAdminAuthenticated(user?.email);

  const userBlocked =
    user &&
    isUserBlocked(user.id, user.email) &&
    !adminSessionOnAdminRoute &&
    !isBlockedRoute;

  if (userBlocked) {
    return <Navigate to="/blocked" replace />;
  }

  if (user && isBlockedRoute && !isUserBlocked(user.id, user.email)) {
    return <Navigate to="/" replace />;
  }

  if (
    user &&
    biometricLockEnabled &&
    locked &&
    location.pathname !== '/lock' &&
    !isPublic &&
    !isAdminRoute &&
    !isBlockedRoute
  ) {
    return <Navigate to="/lock" replace />;
  }

  if (user && location.pathname === '/login') {
    debug('AppLayout', 'redirect → /');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
