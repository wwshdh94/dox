import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { RadioGroup } from '@/components/Input';
import { stashPendingReferral } from '@/lib/referrals';
import { useVaultStore } from '@/store/useVaultStore';

export function LoginPage() {
  const [consent, setConsent] = useState<'agree' | 'decline'>('decline');
  const [searchParams] = useSearchParams();
  const signInDemo = useVaultStore((s) => s.signInDemo);
  const acceptConsent = useVaultStore((s) => s.acceptConsent);
  const navigate = useNavigate();
  const canContinue = consent === 'agree';

  const refCode = searchParams.get('ref');
  const invitedMember = searchParams.get('member');

  useEffect(() => {
    if (refCode) stashPendingReferral(refCode.toUpperCase());
  }, [refCode]);

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm animate-fade-up space-y-8">
        <div className="text-center">
          <Logo variant="full" size="lg" className="mx-auto mb-4" />
          <p className="text-sm leading-relaxed text-muted">
            Share documents. Never miss an expiry. Your family stays in the loop.
          </p>
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
                label: 'I agree to the Terms of Service and Privacy Policy',
                hint: 'Includes consent to processing of my personal data',
              },
              { value: 'decline', label: 'I do not agree' },
            ]}
          />
        </div>

        <Button
          className="w-full"
          disabled={!canContinue}
          onClick={() => {
            acceptConsent();
            signInDemo();
            navigate('/onboarding');
          }}
        >
          Continue with Google (demo)
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted">
          Demo mode — local storage only. Configure Supabase in .env for production auth.
        </p>
      </div>
    </div>
  );
}
