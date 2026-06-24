import { describe, expect, it } from 'vitest';
import {
  defaultFamilyShareGrantTarget,
  getFamilyViewerMember,
  isDefaultFamilyShareEnabled,
} from '@/lib/defaultFamilyShare';
import type { AppSettings, Document, FamilyMember, ShareGrant, User } from '@/types';

const owner: FamilyMember = {
  id: 'owner',
  displayName: 'Rahul',
  email: 'rahul@gmail.com',
  relationship: 'Self',
  status: 'active',
  role: 'owner',
  joinedAt: '2025-01-01T00:00:00.000Z',
};

const spouse: FamilyMember = {
  id: 'spouse',
  displayName: 'Priya',
  email: 'priya@gmail.com',
  relationship: 'Spouse',
  status: 'active',
  role: 'viewer',
  joinedAt: '2025-06-01T00:00:00.000Z',
};

const ownerUser: User = {
  id: 'u1',
  email: 'rahul@gmail.com',
  name: 'Rahul',
  plan: 'free',
  referralCode: 'ABC',
  referralUploads: 0,
  referralQualified: false,
};

const reviewedDoc: Document = {
  id: 'doc1',
  title: 'PAN',
  docType: 'pan',
  memberId: 'owner',
  fields: {},
  reviewStatus: 'reviewed',
  verificationStatus: 'verified',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const settingsOn: AppSettings = {
  theme: 'system',
  pushReminders: true,
  emailReminders: false,
  cloudAiEnabled: false,
  privacyMode: true,
  onboardingComplete: true,
  defaultFamilyShare: true,
};

const settingsOff: AppSettings = { ...settingsOn, defaultFamilyShare: false };

describe('defaultFamilyShare', () => {
  it('finds active family viewer', () => {
    expect(getFamilyViewerMember([owner, spouse])?.id).toBe('spouse');
    expect(getFamilyViewerMember([owner])).toBeUndefined();
  });

  it('treats default family share as opt-in', () => {
    expect(isDefaultFamilyShareEnabled(settingsOn)).toBe(true);
    expect(isDefaultFamilyShareEnabled(settingsOff)).toBe(false);
    expect(isDefaultFamilyShareEnabled({ ...settingsOn, defaultFamilyShare: undefined })).toBe(false);
  });

  it('returns viewer id when setting is on and doc is reviewed', () => {
    expect(
      defaultFamilyShareGrantTarget(
        reviewedDoc,
        settingsOn,
        [owner, spouse],
        ownerUser,
        [reviewedDoc],
        [],
      ),
    ).toBe('spouse');
  });

  it('skips when setting is off, doc is pending, or grant exists', () => {
    const pendingDoc = { ...reviewedDoc, reviewStatus: 'under_review' as const };
    const grants: ShareGrant[] = [{ id: 'g1', documentId: 'doc1', memberId: 'spouse' }];

    expect(
      defaultFamilyShareGrantTarget(
        reviewedDoc,
        settingsOff,
        [owner, spouse],
        ownerUser,
        [reviewedDoc],
        [],
      ),
    ).toBeNull();
    expect(
      defaultFamilyShareGrantTarget(
        pendingDoc,
        settingsOn,
        [owner, spouse],
        ownerUser,
        [pendingDoc],
        [],
      ),
    ).toBeNull();
    expect(
      defaultFamilyShareGrantTarget(
        reviewedDoc,
        settingsOn,
        [owner, spouse],
        ownerUser,
        [reviewedDoc],
        grants,
      ),
    ).toBeNull();
  });
});
