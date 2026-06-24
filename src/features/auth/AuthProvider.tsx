import { useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getCurrentSession, onAuthStateChange, userFromSession } from '@/lib/supabase/auth';
import { userFromAuthSession } from '@/lib/supabase/profiles';
import { debug } from '@/lib/debug';
import { useVaultStore } from '@/store/useVaultStore';

const SESSION_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  const hydrateAuthUser = useVaultStore((s) => s.hydrateAuthUser);
  const signOutLocal = useVaultStore((s) => s.signOutLocal);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    const hydrateFromSession = async (session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>) => {
      const profileUser = await withTimeout(userFromSession(session), SESSION_TIMEOUT_MS);
      if (cancelled) return;

      if (profileUser) {
        hydrateAuthUser(profileUser);
        return;
      }

      debug('auth', 'profile load slow — using session metadata, retrying in background');
      hydrateAuthUser(userFromAuthSession(session.user));
      void userFromSession(session)
        .then((user) => {
          if (!cancelled) hydrateAuthUser(user);
        })
        .catch((err) => debug('auth', 'background profile load failed', err));
    };

    const applySession = async () => {
      try {
        const session = await withTimeout(getCurrentSession(), SESSION_TIMEOUT_MS);
        if (cancelled) return;

        setAuthReady(true);

        if (!session?.user) return;

        await hydrateFromSession(session);
      } catch (err) {
        debug('auth', 'applySession failed', err);
        if (!cancelled) setAuthReady(true);
      }
    };

    void applySession();

    const unsubscribe =
      onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          signOutLocal();
          return;
        }
        if (session?.user) {
          void hydrateFromSession(session);
        }
      }) ?? (() => {});

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hydrateAuthUser, signOutLocal]);

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-muted">
        Checking session…
      </div>
    );
  }

  return children;
}
