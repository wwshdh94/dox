import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ensureProfileForAuthUser } from '@/lib/supabase/profiles';
import type { User } from '@/types';
import { debug } from '@/lib/debug';

export function authRedirectUrl(): string {
  const configuredOrigin =
    (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim() ||
    (import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined)?.trim();

  if (configuredOrigin) {
    return new URL('/auth/callback', configuredOrigin).toString();
  }

  if (typeof window === 'undefined') return 'http://localhost:5173/auth/callback';
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const redirectTo = authRedirectUrl();
  debug('auth.google', 'signInWithOAuth starting', {
    appOrigin: typeof window === 'undefined' ? null : window.location.origin,
    redirectTo,
    supabaseUrlHost: new URL(import.meta.env.VITE_SUPABASE_URL!.trim()).host,
  });

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'consent' },
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function userFromSession(session: Session): Promise<User> {
  return ensureProfileForAuthUser(session.user);
}

export function onAuthStateChange(
  handler: (event: string, session: Session | null) => void,
): (() => void) | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    handler(event, session);
  });

  return () => data.subscription.unsubscribe();
}

export { isSupabaseConfigured };
