import { describe, expect, it } from 'vitest';
import type { Document, User } from '@/types';
import {
  MAX_UNVERIFIED_DOCS_FREE,
  MAX_UNVERIFIED_DOCS_PRO,
  canStageDocument,
  countVerifiedDocuments,
  countUnverifiedDocuments,
} from './verificationQueue';

const freeUser: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  plan: 'free',
  referralCode: 'ABC',
  referralUploads: 0,
  referralQualified: false,
};

const doc = (id: string, status?: 'pending' | 'verified'): Document => ({
  id,
  title: 'Doc',
  docType: 'passport',
  fields: {},
  verificationStatus: status,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('verificationQueue', () => {
  it('counts verified vs pending separately', () => {
    const docs = [doc('1', 'verified'), doc('2', 'pending'), doc('3')];
    expect(countVerifiedDocuments(docs)).toBe(2);
    expect(countUnverifiedDocuments(docs)).toBe(1);
  });

  it('blocks staging when pending queue is full on free', () => {
    const docs = Array.from({ length: MAX_UNVERIFIED_DOCS_FREE }, (_, i) =>
      doc(String(i), 'pending'),
    );
    expect(canStageDocument(freeUser, docs)).toBe(false);
    expect(canStageDocument(freeUser, docs.slice(0, -1))).toBe(true);
  });

  it('allows more pending on pro', () => {
    const pro = { ...freeUser, plan: 'pro' as const };
    const docs = Array.from({ length: MAX_UNVERIFIED_DOCS_FREE }, (_, i) =>
      doc(String(i), 'pending'),
    );
    expect(canStageDocument(pro, docs)).toBe(true);
    const full = Array.from({ length: MAX_UNVERIFIED_DOCS_PRO }, (_, i) =>
      doc(String(i), 'pending'),
    );
    expect(canStageDocument(pro, full)).toBe(false);
  });
});
