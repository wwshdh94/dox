import { formatRelativeTime } from '@/lib/format';
import type { FamilyMember } from '@/types';

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
