import { describe, expect, it } from 'vitest';
import { buildFamilyTree, computeOwnerRelativeTiers, groupPartnerNodes } from '@/lib/familyStructure';
import type { FamilyMember } from '@/types';

function member(
  id: string,
  displayName: string,
  relationship: string,
  parentMemberId?: string,
  role: FamilyMember['role'] = 'viewer',
): FamilyMember {
  return {
    id,
    displayName,
    relationship,
    status: 'active',
    role,
    parentMemberId,
  };
}

describe('familyStructure', () => {
  it('builds a multi-generation tree from parent links', () => {
    const tree = buildFamilyTree([
      member('gp', 'Dada', 'Grandparent'),
      member('father', 'Rajesh', 'Father', 'gp'),
      member('owner', 'Rahul', 'Self', 'father', 'owner'),
      member('spouse', 'Priya', 'Spouse'),
      member('son', 'Arjun', 'Son', 'owner'),
    ]);

    expect(tree).toHaveLength(1);
    const gpRoot = tree[0];
    expect(gpRoot?.member.id).toBe('gp');
    expect(gpRoot?.children[0]?.member.id).toBe('father');
    expect(gpRoot?.children[0]?.children[0]?.member.id).toBe('owner');
    expect(gpRoot?.children[0]?.children[0]?.partner?.id).toBe('spouse');
    expect(gpRoot?.children[0]?.children[0]?.children[0]?.member.id).toBe('son');
  });

  it('infers father above owner and spouse without manual links', () => {
    const tree = buildFamilyTree([
      member('father', 'Rajesh', 'Father'),
      member('owner', 'Rahul', 'Self', undefined, 'owner'),
      member('spouse', 'Priya', 'Spouse'),
      member('son', 'Arjun', 'Son'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.member.id).toBe('father');
    expect(tree[0]?.children[0]?.member.id).toBe('owner');
    expect(tree[0]?.children[0]?.partner?.id).toBe('spouse');
    expect(tree[0]?.children[0]?.children[0]?.member.id).toBe('son');
  });

  it('pairs father and mother on the same row', () => {
    const tree = buildFamilyTree([
      member('father', 'Rajesh', 'Father'),
      member('mother', 'Sunita', 'Mother'),
      member('owner', 'Rahul', 'Self', undefined, 'owner'),
    ]);
    const groups = groupPartnerNodes(tree);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((n) => n.member.id)).toEqual(['father', 'mother']);
    expect(groups[0]?.[0]?.children[0]?.member.id).toBe('owner');
  });

  it('anchors colour tiers on the owner generation', () => {
    const members = [
      member('father', 'Rajesh', 'Father'),
      member('owner', 'Rahul', 'Self', undefined, 'owner'),
      member('spouse', 'Priya', 'Spouse'),
      member('son', 'Arjun', 'Son'),
    ];
    const tree = buildFamilyTree(members);
    const tiers = computeOwnerRelativeTiers(tree, members);
    expect(tiers.get('father')).toBe(-1);
    expect(tiers.get('owner')).toBe(0);
    expect(tiers.get('spouse')).toBe(0);
    expect(tiers.get('son')).toBe(1);
  });

  it('keeps disabled members in the tree when requested', () => {
    const tree = buildFamilyTree(
      [
        member('owner', 'Rahul', 'Self', undefined, 'owner'),
        member('spouse', 'Priya', 'Spouse'),
        { ...member('son', 'Arjun', 'Son', 'owner'), status: 'disabled' },
      ],
      { includeDisabled: true },
    );

    expect(tree[0]?.member.id).toBe('owner');
    expect(tree[0]?.children.some((n) => n.member.id === 'son')).toBe(true);
  });
});
