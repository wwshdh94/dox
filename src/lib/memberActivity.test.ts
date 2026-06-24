import { describe, expect, it } from 'vitest';
import {
  memberHasJoined,
  memberLastActiveLabel,
  memberStatusLabel,
  resolveMemberStatusLight,
} from '@/lib/memberActivity';
import type { FamilyMember } from '@/types';

const base: FamilyMember = {
  id: 'm1',
  displayName: 'Test',
  relationship: 'Spouse',
  status: 'pending',
  role: 'viewer',
};

describe('memberActivity', () => {
  it('detects joined members', () => {
    expect(memberHasJoined(base)).toBe(false);
    expect(memberHasJoined({ ...base, joinedAt: '2025-06-01T00:00:00.000Z' })).toBe(true);
  });

  it('labels status and last active', () => {
    expect(memberStatusLabel(base)).toBe('Invite pending');
    expect(memberStatusLabel({ ...base, joinedAt: '2025-06-01T00:00:00.000Z', status: 'active' })).toBe(
      'Active',
    );
    expect(memberLastActiveLabel({ ...base, joinedAt: '2025-06-01T00:00:00.000Z' })).toBe('Active');
  });

  it('resolveMemberStatusLight maps member state to dot styles', () => {
    expect(resolveMemberStatusLight({ ...base, status: 'disabled' }).label).toBe('Disabled');
    expect(resolveMemberStatusLight({ ...base, joinedAt: '2025-06-01T00:00:00.000Z' }).dot).toContain(
      'emerald',
    );
    expect(resolveMemberStatusLight(base).pulse).toBe(true);
    expect(resolveMemberStatusLight(base).label).toBe('Invite pending');
  });
});
