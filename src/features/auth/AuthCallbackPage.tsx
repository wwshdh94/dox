import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { getSupabase } from '@/lib/supabase/client';
import { userFromSession } from '@/lib/supabase/auth';
import { useVaultStore } from '@/store/useVaultStore';
import { debug } from '@/lib/debug';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const hydrateAuthUser = useVaultStore((s) => s.hydrateAuthUser);
  const acceptConsent = useVaultStore((s) => s.acceptConsent);
  const [error, setError] = useState<string | null>(null);

  const formatAuthError = (message: string): string => {
    if (message.toLowerCase().includes('pkce code verifier not found')) {
      return [
        'Google sign-in failed because the PKCE verifier was missing.',
        '',
        'This usually happens when the sign-in started in a different browser/app context (e.g. Google opened in a different browser than the one hosting PreVault), or when site storage was cleared mid-flow.',
        '',
        'Fix: go back and try again in the same browser context (don’t switch between Chrome/Safari/in-app browser, and avoid “clear site data”/private mode).',
        '',
        `Details: ${message}`,
      ].join('\n');
    }
    return message;
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured');
      return;
    }

    let cancelled = false;

    void (async () => {
      const url = new URL(window.location.href);
      const oauthError = url.searchParams.get('error');
      const oauthErrorDescription = url.searchParams.get('error_description');
      const authCode = url.searchParams.get('code');

      let storagePkceKeys: string[] = [];
      try {
        storagePkceKeys = Array.from({ length: localStorage.length })
          .map((_, idx) => localStorage.key(idx))
          .filter((k): k is string => Boolean(k))
          .filter((k) => /pkce|code[_-]?verifier/i.test(k));
      } catch {
        storagePkceKeys = [];
      }

      debug('auth.callback', 'arrived', {
        origin: url.origin,
        path: url.pathname,
        hasCode: Boolean(authCode),
        hasOauthError: Boolean(oauthError),
        oauthError,
        storagePkceKeyCount: storagePkceKeys.length,
        storagePkceKeys,
      });

      if (oauthError) {
        setError(
          oauthErrorDescription
            ? `${oauthError}: ${decodeURIComponent(oauthErrorDescription)}`
            : oauthError,
        );
        return;
      }

      if (authCode) {
        debug('auth.callback', 'exchanging code for session', { codeLength: authCode.length });
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (cancelled) return;
        if (exchangeError || !data.session) {
          debug('auth.callback', 'exchange failed', { message: exchangeError?.message ?? null });
          setError(formatAuthError(exchangeError?.message ?? 'Sign-in was cancelled or failed'));
          return;
        }

        // Clear the auth code from the URL once exchanged.
        window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`);

        debug('auth.callback', 'exchange ok; session established', {
          hasUser: Boolean(data.session.user),
          provider: data.session.user?.app_metadata?.provider ?? null,
        });

        acceptConsent();
        const user = await userFromSession(data.session);
        if (cancelled) return;
        hydrateAuthUser(user);
        navigate('/onboarding', { replace: true });
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError || !data.session) {
        debug('auth.callback', 'getSession failed', { message: sessionError?.message ?? null });
        setError(formatAuthError(sessionError?.message ?? 'Sign-in was cancelled or failed'));
        return;
      }

      debug('auth.callback', 'session already present', {
        hasUser: Boolean(data.session.user),
        provider: data.session.user?.app_metadata?.provider ?? null,
      });

      acceptConsent();
      const user = await userFromSession(data.session);
      hydrateAuthUser(user);
      navigate('/onboarding', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [acceptConsent, hydrateAuthUser, navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          className="text-sm font-semibold text-accent-ink underline"
          onClick={() => navigate('/login', { replace: true })}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingScreen label="Signing you in…" />
    </div>
  );
}
