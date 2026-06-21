import { beforeEach, describe, expect, it } from 'vitest';
import { clearAdminEvents } from '@/lib/adminEvents';
import { buildOpsFinanceSnapshot, PRO_ANNUAL_INR } from '@/lib/adminOpsFinanceAnalytics';
import {
  clearPlatformHouseholds,
  upsertPlatformHousehold,
} from '@/lib/adminPlatformRegistry';

describe('buildOpsFinanceSnapshot', () => {
  beforeEach(() => {
    clearAdminEvents();
    clearPlatformHouseholds();
  });

  it('estimates MRR from paid plan mix', () => {
    upsertPlatformHousehold({
      userId: 'p1',
      email: 'pro@test.com',
      name: 'Pro User',
      plan: 'pro',
      memberCount: 2,
      documentCount: 10,
      verifiedDocuments: 10,
      pendingDocuments: 0,
      assetCount: 1,
      bundleCount: 0,
      activeTempLinks: 0,
      membersAtCap: 0,
      referralQualified: false,
      createdAt: '2025-06-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    });
    upsertPlatformHousehold({
      userId: 'f1',
      email: 'fam@test.com',
      name: 'Family User',
      plan: 'free',
      memberCount: 1,
      documentCount: 3,
      verifiedDocuments: 3,
      pendingDocuments: 0,
      assetCount: 0,
      bundleCount: 0,
      activeTempLinks: 0,
      membersAtCap: 0,
      referralQualified: false,
      createdAt: '2025-06-02T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    });

    const snap = buildOpsFinanceSnapshot();
    const expectedMrr = Math.round((PRO_ANNUAL_INR / 12) * 100) / 100;
    expect(snap.finance.paidHouseholds).toBe(1);
    expect(snap.finance.mrrInr).toBe(expectedMrr);
    expect(snap.finance.conversionRatePct).toBe(50);
  });
});
