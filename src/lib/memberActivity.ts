import { formatRelativeTime } from '@/lib/format';
import type { FamilyMember } from '@/types';

export type MemberStatusLight = {
  label: string;
  dot: string;
  pulse?: boolean;
  textClass?: string;
};

export function memberHasJoined(member: FamilyMember): boolean {
  return Boolean(member.joinedAt);
}

export function memberLastActiveLabel(member: FamilyMember): string {
  if (!member.joinedAt) return 'Not on app yet';
  if (!member.lastActiveAt) return 'Active';
  return `Last active ${formatRelativeTime(member.lastActiveAt)}`;
}

export function memberStatusLabel(member: FamilyMember): string {
  if (member.status === 'disabled') return 'Disabled';
  if (memberHasJoined(member)) return 'Active';
  return 'Invite pending';
}

/** Colored status light for family member join / activity state. */
export function resolveMemberStatusLight(member: FamilyMember): MemberStatusLight {
  if (member.status === 'disabled') {
    return {
      label: memberStatusLabel(member),
      dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]',
      textClass: 'text-danger',
    };
  }

  if (memberHasJoined(member)) {
    return {
      label: memberLastActiveLabel(member),
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
      textClass: 'text-success',
    };
  }

  return {
    label: memberStatusLabel(member),
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)]',
    pulse: true,
    textClass: 'text-warning',
  };
}
