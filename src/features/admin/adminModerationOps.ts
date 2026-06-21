import { isProtectedAdminAccount } from '@/lib/adminAuth';
import { appendAdminEvent } from '@/lib/adminEvents';
import { postAdminWebhook } from '@/lib/adminWebhook';
import type { PlatformHousehold } from '@/lib/adminPlatformRegistry';
import {
  __adminReadBlocks,
  __adminReadDiscounts,
  __adminWriteBlocks,
  __adminWriteDiscounts,
  type UserBlockRecord,
  type UserDiscountRecord,
} from '@/lib/userModeration';

export function listBlockedUsers(): UserBlockRecord[] {
  return __adminReadBlocks().sort(
    (a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime(),
  );
}

export function isHouseholdBlocked(household: PlatformHousehold): boolean {
  return __adminReadBlocks().some(
    (b) => b.userId === household.userId || b.email === household.email.toLowerCase(),
  );
}

export async function adminBlockUser(
  household: PlatformHousehold,
  reason: string,
  adminEmail: string,
): Promise<boolean> {
  if (isProtectedAdminAccount(household.email, adminEmail)) return false;

  const record: UserBlockRecord = {
    userId: household.userId,
    email: household.email.toLowerCase(),
    reason: reason.trim() || 'Policy violation',
    blockedAt: new Date().toISOString(),
    blockedBy: adminEmail,
  };

  const blocks = __adminReadBlocks().filter(
    (b) => b.userId !== household.userId && b.email !== record.email,
  );
  __adminWriteBlocks([record, ...blocks]);

  await postAdminWebhook({
    event: 'user_blocked',
    at: record.blockedAt,
    userId: household.userId,
    email: household.email,
    reason: record.reason,
  });

  appendAdminEvent({
    type: 'user_blocked',
    householdUserId: household.userId,
    householdEmail: household.email,
    meta: { reason: record.reason },
  });

  return true;
}

export function adminUnblockUser(household: PlatformHousehold): void {
  __adminWriteBlocks(
    __adminReadBlocks().filter(
      (b) => b.userId !== household.userId && b.email !== household.email.toLowerCase(),
    ),
  );

  appendAdminEvent({
    type: 'user_unblocked',
    householdUserId: household.userId,
    householdEmail: household.email,
  });
}

export function listUserDiscounts(userId?: string): UserDiscountRecord[] {
  const all = __adminReadDiscounts().sort(
    (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
  );
  return userId ? all.filter((d) => d.userId === userId) : all;
}

export async function adminGrantDiscount(
  household: PlatformHousehold,
  input: {
    percentOff: number;
    code: string;
    label: string;
    planTarget?: 'pro' | 'family';
    expiresAt?: string;
    note?: string;
  },
): Promise<UserDiscountRecord> {
  const record: UserDiscountRecord = {
    id: crypto.randomUUID(),
    userId: household.userId,
    email: household.email.toLowerCase(),
    code: input.code.trim().toUpperCase() || `SAVE${input.percentOff}`,
    label: input.label.trim() || `${input.percentOff}% off`,
    percentOff: Math.min(100, Math.max(1, Math.round(input.percentOff))),
    planTarget: input.planTarget ?? 'pro',
    grantedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    note: input.note?.trim(),
  };

  const others = __adminReadDiscounts().filter((d) => d.userId !== household.userId);
  __adminWriteDiscounts([record, ...others]);

  await postAdminWebhook({
    event: 'discount_granted',
    at: record.grantedAt,
    userId: household.userId,
    email: household.email,
    code: record.code,
    percentOff: record.percentOff,
  });

  appendAdminEvent({
    type: 'discount_granted',
    householdUserId: household.userId,
    householdEmail: household.email,
    meta: { code: record.code, percentOff: record.percentOff },
  });

  return record;
}

export function adminRevokeDiscount(userId: string): void {
  __adminWriteDiscounts(__adminReadDiscounts().filter((d) => d.userId !== userId));

  appendAdminEvent({
    type: 'discount_revoked',
    householdUserId: userId,
  });
}
