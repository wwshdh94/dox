import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { RadioGroup } from '@/components/Input';
import { stashPendingReferral } from '@/lib/referrals';
import { isDemoAuthEnabled, isSupabaseConfigured } from '@/lib/supabase/client';
import { signInWithGoogle } from '@/lib/supabase/auth';
import { useVaultStore } from '@/store/useVaultStore';

import { GoogleIcon } from '@/components/icons/GoogleIcon';

export function LoginPage() {
  const [consent, setConsent] = useState<'agree' | 'decline'>('decline');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const signInDemo = useVaultStore((s) => s.signInDemo);
  const acceptConsent = useVaultStore((s) => s.acceptConsent);
  const completeWelcome = useVaultStore((s) => s.completeWelcome);
  const enterGuestExplore = useVaultStore((s) => s.enterGuestExplore);
  const navigate = useNavigate();
  const canContinue = consent === 'agree';
  const supabaseAuth = isSupabaseConfigured();
  const demoAuth = isDemoAuthEnabled();

  const refCode = searchParams.get('ref');
  const invitedMember = searchParams.get('member');

  useEffect(() => {
    if (refCode) stashPendingReferral(refCode.toUpperCase());
    completeWelcome();
  }, [refCode, completeWelcome]);

  const handleGoogleSignIn = async () => {
    if (!canContinue) return;
    setAuthError(null);
    acceptConsent();

    if (supabaseAuth) {
      setBusy(true);
      const result = await signInWithGoogle();
      if (!result.ok) {
        setAuthError(result.error);
        setBusy(false);
      }
      return;
    }

    if (demoAuth) {
      signInDemo();
      navigate('/onboarding');
      return;
    }

    setAuthError('Sign-in is not configured for this environment.');
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm animate-fade-up space-y-8">
        <div className="text-center">
          <Logo variant="full" size="lg" className="mx-auto mb-4" />
          <p className="text-sm leading-relaxed text-muted">
            Sign in with Google to save your encrypted family vault.
          </p>
        </div>

        <div className="surface-panel space-y-3 p-4 text-sm">
          <p className="font-semibold text-text">How we protect you</p>
          <ul className="space-y-1.5 text-xs text-muted">
            <li>Documents encrypted on your device before cloud upload</li>
            <li>TLS encryption for every message and API call</li>
            <li>India-region storage · we cannot read your files</li>
          </ul>
        </div>

        {refCode && (
          <p className="rounded-xl border border-accent-muted bg-accent-soft/40 px-3 py-2 text-center text-xs text-muted">
            {invitedMember
              ? `You were invited by ${invitedMember}. Referral code ${refCode.toUpperCase()} will be applied.`
              : `Referral code ${refCode.toUpperCase()} will be applied when you sign up.`}
          </p>
        )}

        <div className="surface-panel p-5">
          <RadioGroup
            label="Consent"
            name="consent"
            value={consent}
            onChange={setConsent}
            options={[
              {
                value: 'agree',
                label: 'I agree',
                hint: 'I agree to the Terms of Service and Privacy Policy, including consent to processing of my personal data.',
              },
              { value: 'decline', label: 'I do not agree' },
            ]}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Read our{' '}
            <Link to="/terms" className="text-accent-ink">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-accent-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {authError && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger">
            {authError}
          </p>
        )}

        <Button
          className="flex w-full items-center justify-center gap-2"
          disabled={!canContinue || busy}
          onClick={() => void handleGoogleSignIn()}
        >
          <GoogleIcon />
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            enterGuestExplore();
            navigate('/', { replace: true });
          }}
        >
          Explore without signing in
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted">
          <Link to="/welcome" className="text-accent-ink">
            See product tour
          </Link>
          {demoAuth && !supabaseAuth ? ' · Demo mode — local storage only' : null}
        </p>
      </div>
    </div>
  );
}
