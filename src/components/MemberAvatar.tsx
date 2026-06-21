import { useMemo } from 'react';
import { memberAvatarGradient } from '@/lib/avatar';
import { inferMemberBirthDate, memberAgeBand } from '@/lib/memberAge';
import { resolveMemberPortraitKind } from '@/lib/memberPortrait';
import { MemberPortraitIcon } from '@/components/MemberPortraitIcon';
import { useVaultStore } from '@/store/useVaultStore';
import type { FamilyMember, MemberGender } from '@/types';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClass: Record<AvatarSize, string> = {
  sm: 'h-12 w-12 rounded-2xl',
  md: 'h-16 w-16 rounded-2xl',
  lg: 'h-20 w-20 rounded-2xl',
};

const iconScale: Record<AvatarSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

function GenderPrompt({
  size,
  onSelect,
}: {
  size: AvatarSize;
  onSelect: (gender: MemberGender) => void;
}) {
  const btn =
    size === 'sm'
      ? 'px-1.5 py-1 text-[0.55rem]'
      : size === 'md'
        ? 'px-2 py-1 text-[0.62rem]'
        : 'px-2.5 py-1.5 text-xs';

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-accent-soft p-1 text-center">
      <span className="text-[0.55rem] font-semibold leading-tight text-muted">Gender?</span>
      <div className="flex gap-1">
        <button
          type="button"
          className={`rounded-lg border border-border bg-surface-elevated font-semibold text-accent-ink ${btn}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect('male');
          }}
        >
          M
        </button>
        <button
          type="button"
          className={`rounded-lg border border-border bg-surface-elevated font-semibold text-accent-ink ${btn}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect('female');
          }}
        >
          F
        </button>
      </div>
    </div>
  );
}

export function MemberAvatar({
  member,
  size = 'sm',
  className = '',
  showGenderPrompt = true,
  documents: documentsProp,
}: {
  member: FamilyMember;
  size?: AvatarSize;
  className?: string;
  /** Show inline M/F picker when no photo and gender is unset. */
  showGenderPrompt?: boolean;
  documents?: ReturnType<typeof useVaultStore.getState>['documents'];
}) {
  const storeDocuments = useVaultStore((s) => s.documents);
  const updateMember = useVaultStore((s) => s.updateMember);
  const documents = documentsProp ?? storeDocuments;

  const portraitKind = useMemo(() => {
    const birthDate = inferMemberBirthDate(member.id, documents);
    const ageBand = memberAgeBand(birthDate);
    return resolveMemberPortraitKind(member.gender, ageBand);
  }, [member.id, member.gender, documents]);

  const frame = `${sizeClass[size]} shrink-0 overflow-hidden shadow-sm ${className}`;

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt=""
        className={`${frame} object-cover`}
      />
    );
  }

  if (!portraitKind) {
    if (showGenderPrompt) {
      return (
        <div className={frame} aria-label="Choose gender for portrait">
          <GenderPrompt
            size={size}
            onSelect={(gender) => updateMember(member.id, { gender })}
          />
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${memberAvatarGradient(member.displayName)} text-lg font-semibold text-white ${frame}`}
      >
        {member.displayName.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-accent-soft ${frame}`}
      aria-hidden="true"
    >
      <MemberPortraitIcon kind={portraitKind} className={iconScale[size]} />
    </div>
  );
}
