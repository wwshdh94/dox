import { describe, expect, it } from 'vitest';
import type { FamilyMember, User } from '@/types';
import {
  FREE_ASSET_LIMIT,
  FREE_DOC_LIMIT,
  FREE_EXTRA_MEMBER_LIMIT,
  canAddAsset,
  canAddMember,
  canCreateBundle,
  canCreateTempLink,
  canUseCloudAi,
  isProUser,
  tempLinkDurationHours,
} from './planLimits';
import { canUploadDocument, getDocumentLimit } from './referrals';

const freeUser: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  plan: 'free',
  referralCode: 'ABC12345',
  referralUploads: 0,
  referralQualified: false,
};

const owner: FamilyMember = {
  id: 'o1',
  displayName: 'Me',
  relationship: 'Self',
  status: 'active',
  role: 'owner',
};

const member = (id: string, name: string): FamilyMember => ({
  id,
  displayName: name,
  relationship: 'Spouse',
  status: 'active',
  role: 'viewer',
});

describe('planLimits', () => {
  it('treats pro and family as paid', () => {
    expect(isProUser({ ...freeUser, plan: 'pro' })).toBe(true);
    expect(isProUser({ ...freeUser, plan: 'family' })).toBe(true);
    expect(isProUser(freeUser)).toBe(false);
  });

  it('limits free tier to 10 documents via referrals', () => {
    expect(getDocumentLimit(freeUser)).toBe(FREE_DOC_LIMIT);
    expect(canUploadDocument(freeUser, FREE_DOC_LIMIT - 1)).toBe(true);
    expect(canUploadDocument(freeUser, FREE_DOC_LIMIT)).toBe(false);
  });

  it('allows only 2 non-owner family members on free', () => {
    const members = [owner, member('m1', 'A'), member('m2', 'B')];
    expect(canAddMember(freeUser, members)).toBe(false);
    expect(canAddMember(freeUser, [owner, member('m1', 'A')])).toBe(true);
    expect(FREE_EXTRA_MEMBER_LIMIT).toBe(2);
  });

  it('limits assets and bundles on free', () => {
    expect(canAddAsset(freeUser, FREE_ASSET_LIMIT - 1)).toBe(true);
    expect(canAddAsset(freeUser, FREE_ASSET_LIMIT)).toBe(false);
    expect(canCreateBundle(freeUser, 0)).toBe(true);
    expect(canCreateBundle(freeUser, 1)).toBe(false);
  });

  it('limits temp links and share duration on free', () => {
    expect(canCreateTempLink(freeUser, 1)).toBe(true);
    expect(canCreateTempLink(freeUser, 2)).toBe(false);
    expect(tempLinkDurationHours(freeUser)).toBe(1);
    expect(tempLinkDurationHours({ ...freeUser, plan: 'pro' })).toBe(24);
  });

  it('gates pro-only features', () => {
    expect(canUseCloudAi(freeUser)).toBe(false);
    expect(canUseCloudAi({ ...freeUser, plan: 'pro' })).toBe(true);
  });
});
