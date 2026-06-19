import { beforeEach, describe, expect, it } from 'vitest';
import { buildPlatformAdminSnapshot } from '@/lib/adminAnalytics';
import { clearAdminEvents } from '@/lib/adminEvents';
import {
  clearPlatformHouseholds,
  upsertPlatformHousehold,
} from '@/lib/adminPlatformRegistry';

describe('buildPlatformAdminSnapshot', () => {
  beforeEach(() => {
    clearAdminEvents();
    clearPlatformHouseholds();
  });

  it('aggregates metrics across all households', () => {
    upsertPlatformHousehold({
      userId: 'h1',
      email: 'a@test.com',
      name: 'Alice',
      plan: 'free',
      memberCount: 2,
      documentCount: 10,
      verifiedDocuments: 8,
      pendingDocuments: 2,
      assetCount: 1,
      bundleCount: 0,
      activeTempLinks: 1,
      membersAtCap: 0,
      referralQualified: false,
      createdAt: '2025-06-01T00:00:00.000Z',
      updatedAt: '2025-06-10T00:00:00.000Z',
    });
    upsertPlatformHousehold({
      userId: 'h2',
      email: 'b@test.com',
      name: 'Bob',
      plan: 'pro',
      memberCount: 3,
      documentCount: 25,
      verifiedDocuments: 24,
      pendingDocuments: 1,
      assetCount: 2,
      bundleCount: 1,
      activeTempLinks: 0,
      membersAtCap: 1,
      referralQualified: true,
      createdAt: '2025-06-05T00:00:00.000Z',
      updatedAt: '2025-06-11T00:00:00.000Z',
    });

    const snapshot = buildPlatformAdminSnapshot();

    expect(snapshot.totals.households).toBe(2);
    expect(snapshot.totals.freePlans).toBe(1);
    expect(snapshot.totals.proPlans).toBe(1);
    expect(snapshot.totals.totalDocuments).toBe(35);
    expect(snapshot.totals.verifiedDocuments).toBe(32);
    expect(snapshot.totals.pendingDocuments).toBe(3);
    expect(snapshot.totals.householdsAtCap).toBe(1);
    expect(snapshot.households).toHaveLength(2);
    expect(snapshot.signupTrend).toHaveLength(14);
    expect(snapshot.activityTrend).toHaveLength(14);
  });
});
