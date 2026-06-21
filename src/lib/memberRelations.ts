import { getOwnerMember } from '@/lib/family';
import { inferMemberBirthDate, memberAgeYears } from '@/lib/memberAge';
import type { Document, FamilyMember } from '@/types';

export const MEMBER_RELATIONSHIPS = [
  'Spouse',
  'Son',
  'Daughter',
  'Child',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandparent',
  'Other',
] as const;

export type MemberRelationship = (typeof MEMBER_RELATIONSHIPS)[number];

const CHILD_RELATIONSHIPS = new Set(['son', 'daughter', 'child']);

export function isChildRelationship(relationship: string): boolean {
  return CHILD_RELATIONSHIPS.has(relationship.trim().toLowerCase());
}

export function memberBirthDate(member: FamilyMember, documents: Document[]): string | undefined {
  return member.dateOfBirth ?? inferMemberBirthDate(member.id, documents);
}

export function memberIsMinor(
  member: FamilyMember,
  documents: Document[],
  asOf = new Date(),
): boolean {
  const years = memberAgeYears(memberBirthDate(member, documents), asOf);
  return years !== undefined && years < 18;
}

/** Adult members who can be linked as a child's parent/guardian. */
export function eligibleParentMembers(
  members: FamilyMember[],
  excludeMemberId?: string,
): FamilyMember[] {
  return members.filter(
    (m) =>
      m.status !== 'disabled' &&
      m.id !== excludeMemberId &&
      !isChildRelationship(m.relationship),
  );
}

/** Parent/guardian member ids for a child — explicit link plus household owner. */
export function guardianMemberIds(child: FamilyMember, members: FamilyMember[]): string[] {
  const ids = new Set<string>();
  const owner = getOwnerMember(members);

  if (child.parentMemberId) ids.add(child.parentMemberId);

  if (isChildRelationship(child.relationship) && owner) {
    ids.add(owner.id);
    const linkedParent = child.parentMemberId
      ? members.find((m) => m.id === child.parentMemberId)
      : undefined;
    if (!child.parentMemberId || linkedParent?.id === owner.id) {
      for (const m of members) {
        if (m.status !== 'disabled' && m.relationship.toLowerCase() === 'spouse') {
          ids.add(m.id);
        }
      }
    }
  }

  return [...ids];
}

export function isGuardianOfMember(
  guardian: FamilyMember,
  child: FamilyMember,
  members: FamilyMember[],
): boolean {
  return guardianMemberIds(child, members).includes(guardian.id);
}

export function relationshipLabel(member: FamilyMember): string {
  return member.relationship.trim() || 'Family member';
}
