import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearUserModeration,
  getActiveDiscount,
  getUserBlock,
  isUserBlocked,
} from '@/lib/userModeration';
import {
  adminBlockUser,
  adminGrantDiscount,
  adminUnblockUser,
} from '@/features/admin/adminModerationOps';
import type { PlatformHousehold } from '@/lib/adminPlatformRegistry';

const household: PlatformHousehold = {
  userId: 'u1',
  email: 'user@test.com',
  name: 'User',
  plan: 'free',
  memberCount: 1,
  documentCount: 1,
  verifiedDocuments: 1,
  pendingDocuments: 0,
  assetCount: 0,
  bundleCount: 0,
  activeTempLinks: 0,
  membersAtCap: 0,
  referralQualified: false,
  createdAt: '2025-06-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
};

describe('userModeration', () => {
  beforeEach(() => {
    clearUserModeration();
  });

  it('blocks and unblocks a user', async () => {
    await adminBlockUser(household, 'Spam uploads', 'admin@test.com');
    expect(isUserBlocked('u1', 'user@test.com')).toBe(true);
    expect(getUserBlock('u1')?.reason).toBe('Spam uploads');

    adminUnblockUser(household);
    expect(isUserBlocked('u1', 'user@test.com')).toBe(false);
  });

  it('grants an active discount for a user', async () => {
    await adminGrantDiscount(household, {
      percentOff: 40,
      code: 'LAUNCH40',
      label: 'Early bird',
    });
    const discount = getActiveDiscount('u1');
    expect(discount?.code).toBe('LAUNCH40');
    expect(discount?.percentOff).toBe(40);
  });
});
