import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminSendPlatformUpdate,
  adminSetHouseholdPlan,
} from '@/lib/adminActions';
import { clearAdminEvents, listAdminEvents } from '@/lib/adminEvents';
import {
  clearPlatformHouseholds,
  listPlatformHouseholds,
  upsertPlatformHousehold,
} from '@/lib/adminPlatformRegistry';
import { clearPlatformUpdates, listUnreadPlatformUpdates } from '@/lib/platformUpdates';

const household = {
  userId: 'u1',
  email: 'owner@test.com',
  name: 'Owner',
  plan: 'free' as const,
  memberCount: 1,
  documentCount: 5,
  verifiedDocuments: 5,
  pendingDocuments: 0,
  assetCount: 0,
  bundleCount: 0,
  activeTempLinks: 0,
  membersAtCap: 0,
  referralQualified: false,
  createdAt: '2025-06-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
};

describe('adminActions', () => {
  beforeEach(() => {
    clearAdminEvents();
    clearPlatformHouseholds();
    clearPlatformUpdates();
    upsertPlatformHousehold(household);
  });

  it('grants Pro and logs plan_change', () => {
    const apply = vi.fn();
    adminSetHouseholdPlan(household, 'pro', apply);
    expect(listPlatformHouseholds()[0].plan).toBe('pro');
    expect(apply).toHaveBeenCalledWith('pro');
    expect(listAdminEvents()[0].type).toBe('plan_change');
  });

  it('queues platform update for a household', async () => {
    await adminSendPlatformUpdate(household, { title: 'Hello', body: 'World' });
    expect(listUnreadPlatformUpdates('u1')).toHaveLength(1);
    expect(listAdminEvents()[0].type).toBe('admin_update');
  });

  it('broadcasts platform update to all users', async () => {
    await adminSendPlatformUpdate('*', { title: 'News', body: 'Maintenance tonight' });
    expect(listUnreadPlatformUpdates('any-user')).toHaveLength(1);
    expect(listAdminEvents()[0].meta?.broadcast).toBe(true);
  });
});
