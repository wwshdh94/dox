import type { FamilyMember, User } from '@/types';
import { getOtherFamilyMembers } from '@/lib/family';

/** Non-owner family members allowed on free plan (owner + 2 others). */
export const FREE_EXTRA_MEMBER_LIMIT = 2;

/** Total documents on free plan before referral bonuses. */
export const FREE_DOC_LIMIT = 10;

export const FREE_ASSET_LIMIT = 3;
export const FREE_BUNDLE_LIMIT = 1;
export const FREE_ACTIVE_TEMP_LINKS = 2;

export const FREE_TEMP_LINK_HOURS = 1;
export const PRO_TEMP_LINK_HOURS = 24;

export const FREE_BUNDLE_SHARE_HOURS = 1;
export const PRO_BUNDLE_SHARE_HOURS = 168;

export const FREE_ACTIVITY_LOG_DAYS = 30;
export const PRO_ACTIVITY_LOG_DAYS = 365;

export interface PlanFeatureRow {
  feature: string;
  free: string;
  pro: string;
}

export const PLAN_FEATURES: PlanFeatureRow[] = [
  { feature: 'Documents', free: '10 (+ referral bonus)', pro: 'Unlimited' },
  { feature: 'Family members', free: 'You + 2 others', pro: 'Unlimited' },
  { feature: 'Assets (vehicle, property, purchases)', free: 'Up to 3', pro: 'Unlimited' },
  { feature: 'Shared bundles', free: '1 bundle', pro: 'Unlimited' },
  { feature: 'Temp share links', free: '2 active · 1 hr', pro: 'Unlimited · 24 hr' },
  { feature: 'Bundle share links', free: '1 hr', pro: 'Up to 7 days' },
  { feature: 'AI extraction', free: 'On-device OCR', pro: 'On-device + cloud AI' },
  { feature: 'Reminders', free: 'Push only', pro: 'Push + email' },
  { feature: 'Visiting card', free: '—', pro: 'Publish + QR + vCard' },
  { feature: 'Backup & restore', free: '—', pro: 'Encrypted file + Google Drive' },
  { feature: 'Activity log', free: '30 days', pro: '1 year' },
  { feature: 'Biometric lock & encryption', free: '✓', pro: '✓' },
];

export function isProUser(user: User | null): boolean {
  return user?.plan === 'pro' || user?.plan === 'family';
}

export function canAddMember(user: User | null, members: FamilyMember[]): boolean {
  if (isProUser(user)) return true;
  return getOtherFamilyMembers(members).length < FREE_EXTRA_MEMBER_LIMIT;
}

/** Re-enabling a disabled member uses the same slot as adding one. */
export function canEnableMember(user: User | null, members: FamilyMember[]): boolean {
  return canAddMember(user, members);
}

export function remainingMemberSlots(user: User | null, members: FamilyMember[]): number | null {
  if (isProUser(user)) return null;
  return Math.max(0, FREE_EXTRA_MEMBER_LIMIT - getOtherFamilyMembers(members).length);
}

export function canAddAsset(user: User | null, assetCount: number): boolean {
  if (isProUser(user)) return true;
  return assetCount < FREE_ASSET_LIMIT;
}

export function remainingAssetSlots(user: User | null, assetCount: number): number | null {
  if (isProUser(user)) return null;
  return Math.max(0, FREE_ASSET_LIMIT - assetCount);
}

export function canCreateBundle(user: User | null, bundleCount: number): boolean {
  if (isProUser(user)) return true;
  return bundleCount < FREE_BUNDLE_LIMIT;
}

export function canCreateTempLink(user: User | null, activeTempLinks: number): boolean {
  if (isProUser(user)) return true;
  return activeTempLinks < FREE_ACTIVE_TEMP_LINKS;
}

export function tempLinkDurationHours(user: User | null): number {
  return isProUser(user) ? PRO_TEMP_LINK_HOURS : FREE_TEMP_LINK_HOURS;
}

export function bundleShareDurationHours(user: User | null): number {
  return isProUser(user) ? PRO_BUNDLE_SHARE_HOURS : FREE_BUNDLE_SHARE_HOURS;
}

export function canUseCloudAi(user: User | null): boolean {
  return isProUser(user);
}

export function canPublishVisitingCard(user: User | null): boolean {
  return isProUser(user);
}

export function canUseVaultBackup(user: User | null): boolean {
  return isProUser(user);
}

export function canUseGoogleDriveBackup(user: User | null): boolean {
  return canUseVaultBackup(user);
}

export function canUseEmailReminders(user: User | null): boolean {
  return isProUser(user);
}

export function activityLogRetentionDays(user: User | null): number {
  return isProUser(user) ? PRO_ACTIVITY_LOG_DAYS : FREE_ACTIVITY_LOG_DAYS;
}

export function formatShareDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  if (hours >= 168) return '7 days';
  if (hours >= 24) return '24 hr';
  return `${hours} hr`;
}
