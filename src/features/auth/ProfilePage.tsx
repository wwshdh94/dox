import { useVaultStore } from '@/store/useVaultStore';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ProfileHero } from '@/features/auth/ProfileHero';
import { ProfileMenuRow, ProfileMenuSection } from '@/features/auth/ProfileMenuSection';
import { ProfilePreferencesCard } from '@/features/auth/ProfilePreferencesCard';
import { ProfileQuickAction } from '@/features/auth/ProfileQuickAction';
import { getOwnerMember, getOtherFamilyMembers } from '@/lib/family';
import { profileBackupStatusLabel } from '@/lib/profileStats';
import { canUseVaultBackup, canUseCloudAi, isProUser } from '@/lib/planLimits';
import type { ThemeMode } from '@/types';

export function ProfilePage() {
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const setSettings = useVaultStore((s) => s.setSettings);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const visitingCard = useVaultStore((s) => s.visitingCard);

  const onPro = isProUser(user ?? null);
  const backupAllowed = canUseVaultBackup(user ?? null);
  const cloudAllowed = canUseCloudAi(user);
  const ownerMember = getOwnerMember(members);
  const familyCount = getOtherFamilyMembers(members).length + (ownerMember ? 1 : 0);
  const backupStatus = profileBackupStatusLabel(settings);
  const lockOn = Boolean(settings.biometricLockEnabled);
  const haptics = settings.hapticFeedback !== false;

  const setOcrMode = (mode: 'device' | 'cloud' | 'manual') => {
    if (mode === 'manual') {
      setSettings({ documentProcessingEnabled: false });
      return;
    }
    setSettings({
      documentProcessingEnabled: true,
      privacyMode: mode === 'device',
      cloudAiEnabled: mode === 'cloud' && cloudAllowed,
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-full pb-28">
      <Header backFallback="/" />
      <main className="page-main animate-fade-up space-y-4">
        <ProfileHero
          user={user}
          documents={documents}
          members={members}
          settings={settings}
        />

        <div className="grid grid-cols-2 gap-2">
          <ProfileQuickAction
            to="/profile/family"
            tone="navy"
            hapticsEnabled={haptics}
            label="Family"
            subtitle={`${familyCount} member${familyCount === 1 ? '' : 's'}`}
            icon={
              <svg className="h-4 w-4 text-accent-ink" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                  fill="currentColor"
                />
              </svg>
            }
          />
          <ProfileQuickAction
            to="/profile/plan"
            tone="gold"
            hapticsEnabled={haptics}
            label={onPro ? 'Pro plan' : 'Upgrade'}
            subtitle={onPro ? 'All features active' : 'Unlock more vault space'}
            icon={
              <svg className="h-4 w-4 text-[var(--gold-dark)] dark:text-[var(--gold-light)]" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
                  fill="currentColor"
                />
              </svg>
            }
          />
          <ProfileQuickAction
            to={backupAllowed ? '/profile/backup' : '/profile/plan'}
            tone="success"
            hapticsEnabled={haptics}
            label="Backup"
            subtitle={backupAllowed ? backupStatus.label : 'Pro feature'}
            badge={
              backupStatus.tone === 'warn' ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
                </span>
              ) : undefined
            }
            icon={
              <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
                  fill="currentColor"
                />
              </svg>
            }
          />
          <ProfileQuickAction
            to="/profile/security"
            tone="muted"
            hapticsEnabled={haptics}
            label="Security"
            subtitle={lockOn ? 'Biometric lock on' : 'Review encryption & lock'}
            icon={
              <svg className="h-4 w-4 text-accent-ink" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3z"
                  fill="currentColor"
                />
              </svg>
            }
          />
        </div>

        <ProfilePreferencesCard
          user={user}
          settings={settings}
          onTheme={(theme) => setSettings({ theme: theme as ThemeMode })}
          onReminders={(mode) => setSettings({ pushReminders: mode === 'push' })}
          onOcrMode={setOcrMode}
        />

        <ProfileMenuSection title="Vault" accent="navy">
          <ProfileMenuRow
            to="/profile/activity"
            hapticsEnabled={haptics}
            label="Activity"
            subtitle="Shares and recent actions"
            icon={<span className="text-base">📋</span>}
          />
          <ProfileMenuRow
            to="/profile/archived"
            hapticsEnabled={haptics}
            label="Archived"
            subtitle="Documents you archived"
            icon={<span className="text-base">🗂️</span>}
          />
          <ProfileMenuRow
            to="/bundles"
            hapticsEnabled={haptics}
            label="Bundles"
            subtitle="Vehicle & document packs"
            icon={<span className="text-base">📦</span>}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="Rewards" accent="gold">
          <ProfileMenuRow
            to="/profile/referrals"
            hapticsEnabled={haptics}
            label="Referrals"
            subtitle="Invite friends, earn doc space"
            icon={<span className="text-base">🎁</span>}
          />
          <ProfileMenuRow
            to="/profile/earn-pro"
            hapticsEnabled={haptics}
            label="Earn Pro"
            subtitle="Complete launch tasks"
            icon={<span className="text-base">✨</span>}
          />
          <ProfileMenuRow
            to="/profile/visiting-card"
            hapticsEnabled={haptics}
            label="Visiting card"
            subtitle={visitingCard?.published ? 'Published — tap to edit' : 'Create your digital card'}
            badge={
              visitingCard?.published ? (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[0.6rem] font-semibold text-success">
                  Live
                </span>
              ) : undefined
            }
            icon={<span className="text-base">💳</span>}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="Account & help" accent="success">
          <ProfileMenuRow
            to="/profile/appearance"
            hapticsEnabled={haptics}
            label="Appearance"
            subtitle="Theme and display"
            icon={<span className="text-base">🎨</span>}
          />
          <ProfileMenuRow
            to="/profile/account"
            hapticsEnabled={haptics}
            label="Account"
            subtitle="Sign out, delete vault"
            icon={<span className="text-base">👤</span>}
          />
          <ProfileMenuRow
            to="/profile/contact"
            hapticsEnabled={haptics}
            label="Contact us"
            icon={<span className="text-base">💬</span>}
          />
          <ProfileMenuRow
            to="/profile/feedback"
            hapticsEnabled={haptics}
            label="Feedback"
            icon={<span className="text-base">📝</span>}
          />
          <ProfileMenuRow
            to="/terms"
            hapticsEnabled={haptics}
            label="Terms of Service"
            icon={<span className="text-base">📄</span>}
          />
          <ProfileMenuRow
            to="/privacy"
            hapticsEnabled={haptics}
            label="Privacy Policy"
            icon={<span className="text-base">🔒</span>}
          />
        </ProfileMenuSection>
      </main>
      <BottomNav />
    </div>
  );
}
