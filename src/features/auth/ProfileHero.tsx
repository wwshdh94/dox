import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlanBadge } from '@/components/PlanBadge';
import { profileBackupStatusLabel, profileVaultStats } from '@/lib/profileStats';
import type { AppSettings, Document, FamilyMember, User } from '@/types';

const avatarRing =
  'ring-2 ring-[color-mix(in_srgb,var(--gold-border)_45%,transparent)] shadow-sm';

function UserPhotoPlaceholder({ user, size = 'md' }: { user: User; size?: 'md' | 'sm' }) {
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
  const dim = size === 'sm' ? 'h-14 w-14 text-xl' : 'h-16 w-16 text-2xl';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-[color-mix(in_srgb,var(--gold)_18%,var(--surface))] font-display font-semibold text-accent-ink ${dim} ${avatarRing}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function UserPhoto({ user }: { user: User }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = user.avatarUrl?.trim();

  if (!url || imageFailed) {
    return <UserPhotoPlaceholder user={user} />;
  }

  return (
    <img
      src={url}
      alt=""
      className={`h-16 w-16 shrink-0 rounded-2xl object-cover ${avatarRing}`}
      onError={() => setImageFailed(true)}
    />
  );
}

export function ProfileHero({
  user,
  documents,
  members,
  settings,
}: {
  user: User;
  documents: Document[];
  members: FamilyMember[];
  settings: AppSettings;
}) {
  const stats = profileVaultStats(documents, members);
  const backup = profileBackupStatusLabel(settings);

  return (
    <div className="profile-hero surface-panel-elevated overflow-hidden">
      <div className="profile-hero-accent" aria-hidden />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Link to="/profile/account" className="shrink-0 transition-transform active:scale-[0.98]">
            <UserPhoto user={user} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl text-text">{user.name}</p>
              <PlanBadge plan={user.plan} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            {user.lifetimePro ? (
              <p className="mt-1.5 inline-flex rounded-full bg-success/15 px-2 py-0.5 text-[0.6rem] font-semibold text-success">
                Lifetime Pro
              </p>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-1.5 border-t border-border-soft pt-3 text-center">
          <div>
            <dt className="text-[0.55rem] font-semibold uppercase tracking-wide text-muted">Documents</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-text">{stats.docs}</dd>
            <dd className="text-[0.55rem] text-muted">{stats.verified} verified</dd>
          </div>
          <div>
            <dt className="text-[0.55rem] font-semibold uppercase tracking-wide text-muted">Family</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-text">{stats.activeMembers}</dd>
            <dd className="text-[0.55rem] text-muted">members</dd>
          </div>
          <div>
            <dt className="text-[0.55rem] font-semibold uppercase tracking-wide text-muted">Backup</dt>
            <dd
              className={`mt-0.5 text-[0.65rem] font-semibold leading-snug ${
                backup.tone === 'warn' ? 'text-warning' : backup.tone === 'ok' ? 'text-success' : 'text-muted'
              }`}
            >
              {backup.label}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
