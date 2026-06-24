import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  LAUNCH_APPROVED_FEEDBACK_COUNT,
  LAUNCH_FAMILY_MEMBER_COUNT,
  LAUNCH_UPLOAD_DOC_COUNT,
  evaluateLaunchTask,
  hasEarnedLifetimePro,
} from '@/lib/launchTasks';
import type { AppSettings, Document, FamilyMember, User } from '@/types';

vi.mock('@/lib/feedback', () => ({
  countAdminApprovedQualityFeedback: vi.fn(() => 0),
}));

import { countAdminApprovedQualityFeedback } from '@/lib/feedback';

const user: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
  plan: 'free',
  referralCode: 'ABCD1234',
  referralUploads: 0,
  referralQualified: false,
  launchCohort: true,
  launchCohortNumber: 42,
};

const owner: FamilyMember = {
  id: 'm1',
  displayName: 'Test',
  relationship: 'self',
  status: 'active',
  role: 'owner',
};

const baseSettings: AppSettings = {
  theme: 'system',
  pushReminders: true,
  emailReminders: true,
  cloudAiEnabled: false,
  privacyMode: true,
  onboardingComplete: false,
};

function doc(id: string, reviewStatus: Document['reviewStatus'] = 'reviewed'): Document {
  return {
    id,
    title: 'Doc',
    docType: 'pan',
    memberId: 'm1',
    domain: 'family',
    category: 'identity',
    reviewStatus,
    verificationStatus: 'verified',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    fields: {},
  };
}

describe('launchTasks', () => {
  beforeEach(() => {
    vi.mocked(countAdminApprovedQualityFeedback).mockReturnValue(0);
  });

  it('requires launch cohort membership', () => {
    const status = evaluateLaunchTask('onboarding_complete', {
      user: { ...user, launchCohort: false },
      documents: [],
      members: [owner],
      settings: { ...baseSettings, onboardingComplete: true },
    });
    expect(status).toBe('pending');
  });

  it(`requires ${LAUNCH_UPLOAD_DOC_COUNT} uploads`, () => {
    const docs = Array.from({ length: LAUNCH_UPLOAD_DOC_COUNT - 1 }, (_, i) => doc(String(i)));
    expect(
      evaluateLaunchTask('upload_11_docs', {
        user,
        documents: docs,
        members: [owner],
        settings: baseSettings,
      }),
    ).toBe('pending');

    docs.push(doc('last'));
    expect(
      evaluateLaunchTask('upload_11_docs', {
        user,
        documents: docs,
        members: [owner],
        settings: baseSettings,
      }),
    ).toBe('done');
  });

  it(`requires ${LAUNCH_FAMILY_MEMBER_COUNT} family members`, () => {
    const members: FamilyMember[] = [owner];
    for (let i = 0; i < LAUNCH_FAMILY_MEMBER_COUNT; i++) {
      members.push({
        id: `m${i + 2}`,
        displayName: `Member ${i}`,
        relationship: 'other',
        status: 'active',
        role: 'viewer',
      });
    }
    expect(
      evaluateLaunchTask('add_4_family_members', {
        user,
        documents: [],
        members,
        settings: baseSettings,
      }),
    ).toBe('done');
  });

  it(`requires ${LAUNCH_APPROVED_FEEDBACK_COUNT} admin-approved feedback`, () => {
    vi.mocked(countAdminApprovedQualityFeedback).mockReturnValue(1);
    expect(
      evaluateLaunchTask('approved_feedback', {
        user,
        documents: [],
        members: [owner],
        settings: baseSettings,
      }),
    ).toBe('pending');

    vi.mocked(countAdminApprovedQualityFeedback).mockReturnValue(2);
    expect(
      evaluateLaunchTask('approved_feedback', {
        user,
        documents: [],
        members: [owner],
        settings: baseSettings,
      }),
    ).toBe('done');
  });

  it('grants lifetime pro only for cohort members', () => {
    expect(hasEarnedLifetimePro({ user: { ...user, lifetimePro: true }, documents: [], members: [owner], settings: baseSettings })).toBe(true);
    expect(hasEarnedLifetimePro({ user: { ...user, launchCohort: false }, documents: [], members: [owner], settings: baseSettings })).toBe(false);
  });
});
