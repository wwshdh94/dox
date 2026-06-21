import { Link } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { PlanBadge } from '@/components/PlanBadge';
import { PlatformUpdateBanner } from '@/components/PlatformUpdateBanner';
import { countUnreadFeedbackReplies } from '@/lib/feedback';
import { SegmentedControl } from '@/components/SegmentedControl';
import { isProUser, canUseCloudAi, canUseEmailReminders } from '@/lib/planLimits';
import { useVaultStore } from '@/store/useVaultStore';
import type { ThemeMode } from '@/types';

function UserNavPill({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-9 w-28 items-center justify-center rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold text-text shadow-sm transition-all hover:border-accent-muted hover:bg-accent-soft/40 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function SettingsNavPill({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center rounded-full border border-border bg-surface-elevated px-2 py-2 text-center text-[0.65rem] font-semibold leading-tight text-text shadow-sm transition-all hover:border-accent-muted hover:bg-accent-soft/40 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function RecoveryEyeIcon({ revealed }: { revealed: boolean }) {
  if (revealed) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-4.02 5.18M6.12 6.12A18.5 18.5 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.08-1.24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecoveryCodePanel({ code }: { code: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const masked = code.replace(/[^\s-]/g, '•');

  const copyCode = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="surface-panel p-3 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={revealed ? 'Hide recovery code' : 'Show recovery code'}
          aria-pressed={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-soft text-muted transition-colors hover:bg-accent-soft hover:text-text"
        >
          <RecoveryEyeIcon revealed={revealed} />
        </button>
        <p className="min-w-0 flex-1 break-all font-mono text-muted">{revealed ? code : masked}</p>
        <button
          type="button"
          aria-label={copied ? 'Copied recovery code' : 'Copy recovery code'}
          onClick={copyCode}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-soft text-muted transition-colors hover:bg-accent-soft hover:text-text"
        >
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const setSettings = useVaultStore((s) => s.setSettings);
  const signOut = useVaultStore((s) => s.signOut);
  const visitingCard = useVaultStore((s) => s.visitingCard);
  const onPro = isProUser(user ?? null);
  const emailAllowed = canUseEmailReminders(user);
  const cloudAllowed = canUseCloudAi(user);
  const unreadFeedback = user ? countUnreadFeedbackReplies(user.id) : 0;

  const reminderQuick =
    settings.pushReminders && settings.emailReminders
      ? 'both'
      : settings.pushReminders
        ? 'push'
        : settings.emailReminders
          ? 'email'
          : 'off';

  const setReminderQuick = (mode: 'off' | 'push' | 'email' | 'both') => {
    if (!emailAllowed && (mode === 'both' || mode === 'email')) {
      setSettings({ pushReminders: mode === 'both', emailReminders: false });
      return;
    }
    setSettings({
      pushReminders: mode === 'both' || mode === 'push',
      emailReminders: mode === 'both' || mode === 'email',
    });
  };

  const ocrMode = settings.privacyMode || !settings.cloudAiEnabled ? 'device' : 'cloud';

  const setOcrMode = (mode: 'device' | 'cloud') => {
    if (mode === 'cloud' && !cloudAllowed) return;
    setSettings({
      privacyMode: mode === 'device',
      cloudAiEnabled: mode === 'cloud',
    });
  };

  return (
    <div className="min-h-full pb-28">
      <Header
        backFallback="/"
        center={user?.plan ? <PlanBadge plan={user.plan} /> : undefined}
      />
      <main className="page-main animate-fade-up space-y-5">
        {user?.id ? <PlatformUpdateBanner userId={user.id} /> : null}
        <div className="surface-panel-elevated p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl text-text">{user?.name}</p>
              <p className="mt-1 text-sm text-muted">{user?.email}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <UserNavPill to="/profile/family">Family</UserNavPill>
              <UserNavPill to="/profile/plan">{onPro ? 'Plan' : 'Upgrade'}</UserNavPill>
            </div>
          </div>
        </div>

        <section className="space-y-4 surface-panel p-4">
          <p className="section-label">Display & alerts</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[0.65rem] font-medium text-muted">Theme</p>
              <SegmentedControl
                size="dense"
                aria-label="Theme"
                value={settings.theme}
                onChange={(v) => setSettings({ theme: v as ThemeMode })}
                options={[
                  { value: 'system', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <p className="text-[0.65rem] font-medium text-muted">Expiry reminders</p>
              <SegmentedControl
                size="dense"
                aria-label="Expiry reminders"
                value={reminderQuick}
                onChange={(v) => setReminderQuick(v as 'off' | 'push' | 'email' | 'both')}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'push', label: 'Push' },
                  { value: 'email', label: 'Email', disabled: !emailAllowed },
                  { value: 'both', label: 'Both', disabled: !emailAllowed },
                ]}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <p className="text-[0.65rem] font-medium text-muted">OCR</p>
              <SegmentedControl
                size="dense"
                aria-label="OCR extraction"
                value={ocrMode}
                onChange={(v) => setOcrMode(v as 'device' | 'cloud')}
                options={[
                  { value: 'device', label: 'On-device OCR' },
                  { value: 'cloud', label: 'Cloud OCR', disabled: !cloudAllowed },
                ]}
              />
            </div>
          </div>

          {!emailAllowed && (
            <p className="text-[0.65rem] text-muted">
              Email reminders on Pro.{' '}
              <Link to="/profile/plan" className="text-accent-ink">
                Upgrade
              </Link>
            </p>
          )}

          {!cloudAllowed && (
            <p className="text-[0.65rem] text-muted">
              Cloud OCR on Pro.{' '}
              <Link to="/profile/plan" className="text-accent-ink">
                Upgrade
              </Link>
            </p>
          )}
        </section>

        <section className="space-y-2">
          <p className="section-label">Vault</p>
          <div className="flex gap-2">
            <SettingsNavPill to="/profile/activity">Activity</SettingsNavPill>
            <SettingsNavPill to="/profile/archived">Archived</SettingsNavPill>
            <SettingsNavPill to="/bundles">Bundles</SettingsNavPill>
          </div>
        </section>

        <section className="space-y-2">
          <p className="section-label">Help</p>
          <div className="flex gap-2">
            <Link
              to="/profile/feedback"
              className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2 py-2 text-center text-[0.65rem] font-semibold leading-tight text-text shadow-sm transition-all hover:border-accent-muted hover:bg-accent-soft/40 active:scale-[0.98]"
            >
              Feedback
              {unreadFeedback > 0 ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.55rem] text-accent-fg">
                  {unreadFeedback}
                </span>
              ) : null}
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <p className="section-label">Account</p>
          <div className="flex gap-2">
            <SettingsNavPill to="/profile/referrals">Referrals</SettingsNavPill>
            <SettingsNavPill to="/profile/visiting-card">
              {visitingCard?.published ? 'Card ✓' : 'Visiting card'}
            </SettingsNavPill>
          </div>
        </section>

        <section className="space-y-2">
          <p className="section-label">Security & backup</p>
          <div className="flex gap-2">
            <SettingsNavPill to="/profile/security">Security</SettingsNavPill>
            <SettingsNavPill to="/profile/backup">Backup</SettingsNavPill>
          </div>
        </section>

        {settings.recoveryCode && (
          <section className="space-y-2">
            <p className="text-[0.7rem] font-semibold tracking-wide text-muted">Recovery Code</p>
            <RecoveryCodePanel code={settings.recoveryCode} />
          </section>
        )}

        <Button variant="secondary" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}
