import { describe, expect, it } from 'vitest';
import { familyTransferCandidates, mergeTransferCandidates } from '@/lib/accountLifecycle';
import type { FamilyMember } from '@/types';

const baseMember = (partial: Partial<FamilyMember>): FamilyMember => ({
  id: 'm1',
  displayName: 'Spouse',
  relationship: 'Spouse',
  status: 'active',
  role: 'viewer',
  ...partial,
});

describe('accountLifecycle', () => {
  it('familyTransferCandidates excludes owner and pending members', () => {
    const members: FamilyMember[] = [
      baseMember({ id: 'owner', role: 'owner', relationship: 'Self', joinedAt: '2025-01-01' }),
      baseMember({ id: 'spouse', email: 'spouse@gmail.com', joinedAt: '2025-06-01' }),
      baseMember({ id: 'child', email: 'child@gmail.com' }),
    ];

    expect(familyTransferCandidates(members).map((m) => m.id)).toEqual(['spouse']);
  });

  it('mergeTransferCandidates matches joined family by email', () => {
    const members: FamilyMember[] = [
      baseMember({ id: 'owner', role: 'owner', relationship: 'Self' }),
      baseMember({
        id: 'spouse',
        displayName: 'Priya',
        email: 'priya@gmail.com',
        joinedAt: '2025-06-01',
      }),
    ];

    const merged = mergeTransferCandidates(members, [
      { user_id: 'user-2', email: 'priya@gmail.com', display_name: 'Priya S' },
    ]);

    expect(merged).toEqual([
      {
        userId: 'user-2',
        email: 'priya@gmail.com',
        displayName: 'Priya',
        memberId: 'spouse',
      },
    ]);
  });
});
