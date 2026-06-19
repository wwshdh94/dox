import { describe, expect, it, beforeEach } from 'vitest';
import {
  FREE_TIER_BASE_DOC_LIMIT,
  REFERRAL_BONUS_DOCS,
  REFERRAL_MAX_BONUS_DOCS,
  REFERRAL_QUALIFYING_UPLOADS,
  canUploadDocument,
  getDocumentLimit,
  grantReferralReward,
  readReferralLedger,
  writeReferralLedger,
} from './referrals';
import type { User } from '@/types';

const freeUser = (code: string, overrides?: Partial<User>): User => ({
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  plan: 'free',
  referralCode: code,
  referralUploads: 0,
  referralQualified: false,
  ...overrides,
});

describe('referrals', () => {
  beforeEach(() => {
    localStorage.removeItem('dox-referral-ledger');
  });

  it('limits free tier uploads with base allowance', () => {
    const user = freeUser('ABC12345');
    expect(getDocumentLimit(user)).toBe(FREE_TIER_BASE_DOC_LIMIT);
    expect(canUploadDocument(user, FREE_TIER_BASE_DOC_LIMIT - 1)).toBe(true);
    expect(canUploadDocument(user, FREE_TIER_BASE_DOC_LIMIT)).toBe(false);
  });

  it('grants bonus docs to referrer capped at 15', () => {
    const code = 'REFCODE1';
    expect(grantReferralReward(code, 'user-a')).toBe(true);
    let entry = readReferralLedger()[code]!;
    expect(entry.bonusDocsEarned).toBe(REFERRAL_BONUS_DOCS);

    for (let i = 0; i < 4; i++) {
      grantReferralReward(code, `user-${i + 2}`);
    }
    entry = readReferralLedger()[code]!;
    expect(entry.bonusDocsEarned).toBe(REFERRAL_MAX_BONUS_DOCS);

    expect(grantReferralReward(code, 'user-extra')).toBe(false);
  });

  it('does not double-reward same referred user', () => {
    const code = 'REFCODE2';
    expect(grantReferralReward(code, 'same-user')).toBe(true);
    expect(grantReferralReward(code, 'same-user')).toBe(false);
  });

  it('pro users have unlimited uploads', () => {
    const user: User = {
      ...freeUser('X'),
      plan: 'pro',
    };
    expect(getDocumentLimit(user)).toBeNull();
    expect(canUploadDocument(user, 999)).toBe(true);
  });

  it('adds bonus to document limit', () => {
    writeReferralLedger({
      MYCODE12: { bonusDocsEarned: 6, successfulReferrals: 2, rewardedUserIds: [] },
    });
    const user = freeUser('MYCODE12');
    expect(getDocumentLimit(user)).toBe(FREE_TIER_BASE_DOC_LIMIT + 6);
  });

  it('exports qualifying upload constant', () => {
    expect(REFERRAL_QUALIFYING_UPLOADS).toBe(5);
  });
});
