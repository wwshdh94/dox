import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useVaultStore } from '@/store/useVaultStore';
import {
  REFERRAL_BONUS_DOCS,
  getDocumentLimit,
  mailtoShareUrl,
  referralInviteMessage,
  referralSignupUrl,
  remainingUploads,
  whatsAppShareUrl,
} from '@/lib/referrals';
import { countVerifiedDocuments } from '@/lib/verificationQueue';

export function ReferralsPage() {
  const user = useVaultStore((s) => s.user);
  const documents = useVaultStore((s) => s.documents);

  if (!user) return null;

  const code = user.referralCode;
  const limit = getDocumentLimit(user);
  const remaining = remainingUploads(user, countVerifiedDocuments(documents));

  const message = referralInviteMessage(user.name, code);
  const url = referralSignupUrl(code);

  const share = (channel: 'whatsapp' | 'email' | 'copy') => {
    if (channel === 'whatsapp') {
      window.open(whatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
    } else if (channel === 'email') {
      window.location.href = mailtoShareUrl('Join me on PreVault', message);
    } else {
      void navigator.clipboard.writeText(`${message}\n\n${url}`);
    }
  };

  return (
    <div className="min-h-full pb-28">
      <Header title="Referrals" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <p className="text-sm text-muted">
          Invite friends and family to PreVault. When someone joins with your link and starts using their
          vault, you earn <strong className="text-text">{REFERRAL_BONUS_DOCS} extra document uploads</strong>{' '}
          on the free plan.
        </p>

        <div className="surface-panel space-y-3 p-4">
          <p className="section-label">Your referral code</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-accent-ink">{code}</p>
          <p className="break-all text-xs text-muted">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => share('whatsapp')}>
              WhatsApp
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => share('email')}>
              Email
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => share('copy')}>
              Copy link
            </Button>
          </div>
        </div>

        {user.plan === 'free' && remaining !== null && (
          <div className="surface-panel p-4 text-sm">
            <p className="section-label">Your vault</p>
            <p>
              <strong>{remaining}</strong> upload{remaining === 1 ? '' : 's'} remaining
              {limit !== null && (
                <span className="text-muted"> · {countVerifiedDocuments(documents)} of {limit} verified</span>
              )}
            </p>
          </div>
        )}

        {user.plan !== 'free' && (
          <p className="text-sm text-muted">
            You&apos;re on {user.plan} — unlimited uploads. Referrals still help friends join PreVault.
          </p>
        )}

        {user.referredBy && !user.referralQualified && (
          <div className="rounded-xl border border-accent-muted bg-accent-soft/40 p-4 text-sm">
            <p className="font-medium">Thanks for joining via invite</p>
            <p className="mt-1 text-muted">
              Keep adding documents — your referrer earns bonus upload space once you&apos;re set up.
            </p>
          </div>
        )}

        <p className="text-[0.65rem] leading-relaxed text-muted">
          Referral rewards apply when an invited user signs up and completes qualifying uploads.
          Bonus capacity is subject to fair-use limits per account. Terms may change. See{' '}
          <Link to="/terms" className="text-accent-ink">
            Terms of Service
          </Link>{' '}
          for details.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
