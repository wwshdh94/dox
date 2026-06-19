import { describe, expect, it } from 'vitest';
import type { Asset, Document, FamilyMember, User } from '@/types';
import {
  PRODUCTION_MAX_DOCS_PER_MEMBER,
  checkCanAddDocument,
  countDocumentsForMember,
  resolveDocumentMemberId,
} from './documentLimits';

const owner: FamilyMember = {
  id: 'owner',
  displayName: 'Rahul',
  relationship: 'Self',
  status: 'active',
  role: 'owner',
};

const spouse: FamilyMember = {
  id: 'spouse',
  displayName: 'Priya',
  relationship: 'Spouse',
  status: 'active',
  role: 'viewer',
};

const freeUser: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  plan: 'free',
  referralCode: 'ABC',
  referralUploads: 0,
  referralQualified: false,
};

const proUser: User = { ...freeUser, plan: 'pro' };

const doc = (id: string, memberId?: string, status?: 'pending' | 'verified'): Document => ({
  id,
  title: 'Doc',
  docType: 'passport',
  memberId,
  fields: {},
  verificationStatus: status,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

const vehicle: Asset = {
  id: 'veh1',
  type: 'vehicle',
  label: 'Swift',
  ownedByMemberId: 'owner',
};

describe('documentLimits', () => {
  it('resolves asset docs to asset owner', () => {
    expect(resolveDocumentMemberId({ assetId: 'veh1' }, [vehicle], [owner])).toBe('owner');
    expect(resolveDocumentMemberId({}, [], [owner])).toBe('owner');
  });

  it('enforces 50 docs per member for pro users', () => {
    const docs = Array.from({ length: PRODUCTION_MAX_DOCS_PER_MEMBER }, (_, i) =>
      doc(String(i), 'owner', 'verified'),
    );
    const check = checkCanAddDocument(proUser, docs, [], [owner], {
      memberId: 'owner',
      verificationStatus: 'verified',
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('member_cap');
  });

  it('counts pending docs toward member cap', () => {
    const docs = [doc('1', 'spouse', 'pending')];
    expect(countDocumentsForMember(docs, [], [owner, spouse], 'spouse')).toBe(1);
  });

  it('still enforces free plan before member cap', () => {
    const docs = Array.from({ length: 10 }, (_, i) => doc(String(i), 'owner', 'verified'));
    const check = checkCanAddDocument(freeUser, docs, [], [owner], {
      memberId: 'owner',
      verificationStatus: 'verified',
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('plan');
  });
});
