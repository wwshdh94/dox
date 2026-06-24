import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { useStoreHydration } from '@/hooks/useStoreHydration';
import { LoadingScreen } from '@/components/LoadingScreen';
import { GuestSignInBanner } from '@/components/GuestSignInBanner';
import { ScheduledDriveBackupRunner } from '@/features/backup/ScheduledDriveBackupRunner';
import { debug } from '@/lib/debug';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { isUserBlocked } from '@/lib/userModeration';
import { canBrowseWithoutAuth, isGuestExplore, shouldShowWelcome } from '@/lib/guestExplore';

export function AppLayout() {
  const hydrated = useStoreHydration();
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const touchMemberActivity = useVaultStore((s) => s.touchMemberActivity);
  const onboardingComplete = useVaultStore((s) => s.settings.onboardingComplete);
  const location = useLocation();

  useEffect(() => {
    if (hydrated && user && !user.isGuestPreview) {
      touchMemberActivity();
    }
  }, [hydrated, user?.id, user?.isGuestPreview, touchMemberActivity]);

  const isPublic =
    location.pathname === '/login' ||
    location.pathname === '/welcome' ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy' ||
    location.pathname === '/auth/callback' ||
    location.pathname === '/join' ||
    location.pathname.startsWith('/c/') ||
    location.pathname.startsWith('/v/') ||
    location.pathname.startsWith('/p/');

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isBlockedRoute = location.pathname === '/blocked';
  const guestMode = isGuestExplore(settings);

  const biometricLockEnabled = useVaultStore((s) => s.settings.biometricLockEnabled);
  const locked = useVaultStore((s) => s.locked);

  debug('AppLayout', 'render', {
    hydrated,
    path: location.pathname,
    hasUser: !!user,
    guestMode,
    onboardingComplete: onboardingComplete,
  });

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingScreen label="Loading PreVault…" />
      </div>
    );
  }

  if (!canBrowseWithoutAuth(user, settings) && !isPublic) {
    if (shouldShowWelcome(settings)) {
      debug('AppLayout', 'redirect → /welcome');
      return <Navigate to="/welcome" replace />;
    }
    debug('AppLayout', 'redirect → /login');
    return <Navigate to="/login" replace />;
  }

  if (
    user &&
    !user.isGuestPreview &&
    !onboardingComplete &&
    location.pathname !== '/onboarding' &&
    !isAdminRoute &&
    !guestMode
  ) {
    debug('AppLayout', 'redirect → /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  const adminSessionOnAdminRoute =
    Boolean(user) && isAdminRoute && isAdminAuthenticated(user?.email);

  const userBlocked =
    user &&
    !user.isGuestPreview &&
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
    !user.isGuestPreview &&
    biometricLockEnabled &&
    locked &&
    location.pathname !== '/lock' &&
    !isPublic &&
    !isAdminRoute &&
    !isBlockedRoute
  ) {
    return <Navigate to="/lock" replace />;
  }

  if (user && !user.isGuestPreview && location.pathname === '/login') {
    debug('AppLayout', 'redirect → /');
    return <Navigate to="/" replace />;
  }

  if (user && !user.isGuestPreview && location.pathname === '/welcome') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <ScheduledDriveBackupRunner />
      <GuestSignInBanner />
      <Outlet />
    </>
  );
}
