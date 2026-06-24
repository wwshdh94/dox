import { describe, expect, it } from 'vitest';
import {
  childRelationshipForGender,
  eligibleParentMembers,
  genderForRelationship,
  guardianMemberIds,
  isChildRelationship,
  isGuardianOfMember,
  memberIsMinor,
} from '@/lib/memberRelations';
import type { Document, FamilyMember } from '@/types';

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

const child: FamilyMember = {
  id: 'child',
  displayName: 'Arjun',
  relationship: 'Son',
  status: 'active',
  role: 'viewer',
  parentMemberId: 'owner',
  dateOfBirth: '2012-05-10',
};

const docs: Document[] = [];

describe('memberRelations', () => {
  it('detects child relationships', () => {
    expect(isChildRelationship('Son')).toBe(true);
    expect(isChildRelationship('Spouse')).toBe(false);
  });

  it('syncs son/daughter with gender', () => {
    expect(genderForRelationship('Son')).toBe('male');
    expect(genderForRelationship('Daughter')).toBe('female');
    expect(childRelationshipForGender('male')).toBe('Son');
    expect(childRelationshipForGender('female')).toBe('Daughter');
  });

  it('marks members under 18 as minors', () => {
    const asOf = new Date('2026-06-21T12:00:00');
    expect(memberIsMinor(child, docs, asOf)).toBe(true);
    expect(memberIsMinor(spouse, docs, asOf)).toBe(false);
  });

  it('resolves guardians for a child', () => {
    expect(guardianMemberIds(child, [owner, spouse, child])).toEqual(
      expect.arrayContaining(['owner', 'spouse']),
    );
    expect(isGuardianOfMember(owner, child, [owner, spouse, child])).toBe(true);
    expect(isGuardianOfMember(spouse, child, [owner, spouse, child])).toBe(true);
  });

  it('lists eligible parents excluding minors', () => {
    expect(eligibleParentMembers([owner, spouse, child]).map((m) => m.id)).toEqual([
      'owner',
      'spouse',
    ]);
  });
});
