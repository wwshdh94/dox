import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildVaultAlertNotifications,
  countUnreadInbox,
  dismissInboxNotification,
  type VaultInboxContext,
} from '@/lib/inboxNotifications';
import { isInboxNotificationSnoozed, snoozeInboxNotification } from '@/lib/inboxSnooze';
import type { Document, FamilyMember, User } from '@/types';

const user: User = {
  id: 'u1',
  email: 'me@example.com',
  name: 'Me',
  plan: 'free',
  referralCode: 'ABC',
  referralUploads: 0,
  referralQualified: false,
};

const owner: FamilyMember = {
  id: 'm1',
  displayName: 'Me',
  email: 'me@example.com',
  relationship: 'Self',
  status: 'active',
  role: 'owner',
};

const baseDoc = {
  fields: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
} satisfies Partial<Document>;

function ctx(overrides: Partial<VaultInboxContext> = {}): VaultInboxContext {
  return {
    documents: [],
    members: [owner],
    user,
    shareGrants: [],
    familyHomeView: 'me',
    ...overrides,
  };
}

describe('inboxNotifications vault alerts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes under-review documents', () => {
    const documents: Document[] = [
      {
        ...baseDoc,
        id: 'd1',
        title: 'Passport',
        docType: 'passport',
        memberId: 'm1',
        reviewStatus: 'under_review',
      } as Document,
    ];
    const items = buildVaultAlertNotifications(ctx({ documents }));
    expect(items.some((i) => i.type === 'document_review' && i.sourceId === 'd1')).toBe(true);
    expect(items.find((i) => i.sourceId === 'd1')?.title).toContain('Under review');
  });

  it('includes expiring family documents', () => {
    const documents: Document[] = [
      {
        ...baseDoc,
        id: 'd2',
        title: 'PAN',
        docType: 'pan',
        memberId: 'm1',
        reviewStatus: 'reviewed',
        expiryDate: '2026-06-25',
      } as Document,
    ];
    const items = buildVaultAlertNotifications(ctx({ documents }));
    expect(items.some((i) => i.type === 'expiring_soon' && i.sourceId === 'd2')).toBe(true);
  });

  it('hides snoozed expiring alerts', () => {
    const documents: Document[] = [
      {
        ...baseDoc,
        id: 'd2',
        title: 'PAN',
        docType: 'pan',
        memberId: 'm1',
        reviewStatus: 'reviewed',
        expiryDate: '2026-06-25',
      } as Document,
    ];
    snoozeInboxNotification('expiring-d2', 3 * 24 * 60 * 60 * 1000);
    const items = buildVaultAlertNotifications(ctx({ documents }));
    expect(items.some((i) => i.type === 'expiring_soon')).toBe(false);
    expect(isInboxNotificationSnoozed('expiring-d2')).toBe(true);
  });

  it('snoozes review alerts for 1 day via dismiss', () => {
    const documents: Document[] = [
      {
        ...baseDoc,
        id: 'd1',
        title: 'Passport',
        docType: 'passport',
        memberId: 'm1',
        reviewStatus: 'under_review',
      } as Document,
    ];
    const items = buildVaultAlertNotifications(ctx({ documents }));
    dismissInboxNotification(items[0]!);
    expect(buildVaultAlertNotifications(ctx({ documents }))).toHaveLength(0);
    expect(isInboxNotificationSnoozed('review-d1')).toBe(true);
  });

  it('includes health insurance expiring within 60 days', () => {
    const documents: Document[] = [
      {
        ...baseDoc,
        id: 'h1',
        title: 'Star Health',
        docType: 'health_insurance',
        memberId: 'm1',
        reviewStatus: 'reviewed',
        expiryDate: '2026-07-15',
      } as Document,
    ];
    const items = buildVaultAlertNotifications(ctx({ documents }));
    expect(items.some((i) => i.type === 'health_insurance_expiring' && i.sourceId === 'h1')).toBe(true);
  });

  it('counts vault alerts in unread total', () => {
    const documents: Document[] = [
      {
        ...baseDoc,
        id: 'd1',
        title: 'Passport',
        docType: 'passport',
        memberId: 'm1',
        reviewStatus: 'under_review',
      } as Document,
    ];
    expect(countUnreadInbox('u1', ctx({ documents }))).toBeGreaterThanOrEqual(1);
  });
});
