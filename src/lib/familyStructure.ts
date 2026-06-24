import { getOwnerMember } from '@/lib/family';
import { isChildRelationship } from '@/lib/memberRelations';
import type { FamilyMember } from '@/types';

export interface FamilyTreeNode {
  member: FamilyMember;
  /** Spouse shown beside this member (not a separate tree branch). */
  partner?: FamilyMember;
  children: FamilyTreeNode[];
}

function memberTreeSort(a: FamilyMember, b: FamilyMember): number {
  if (a.role === 'owner') return -1;
  if (b.role === 'owner') return 1;
  if (a.relationship.toLowerCase() === 'spouse') return -1;
  if (b.relationship.toLowerCase() === 'spouse') return 1;
  if (a.relationship.toLowerCase() === 'father') return -1;
  if (b.relationship.toLowerCase() === 'father') return 1;
  return a.displayName.localeCompare(b.displayName);
}

function sortNodes(nodes: FamilyTreeNode[]): FamilyTreeNode[] {
  return [...nodes]
    .sort((a, b) => memberTreeSort(a.member, b.member))
    .map((node) => ({
      ...node,
      children: sortNodes(node.children),
    }));
}

function byRelationship(members: FamilyMember[], relationship: string): FamilyMember | undefined {
  const needle = relationship.toLowerCase();
  return members.find((m) => m.relationship.trim().toLowerCase() === needle);
}

function inferParentMap(active: FamilyMember[]): Map<string, string> {
  const map = new Map<string, string>();
  const owner = getOwnerMember(active);
  const father = byRelationship(active, 'father');
  const mother = byRelationship(active, 'mother');
  const grandparent = byRelationship(active, 'grandparent');

  for (const member of active) {
    if (member.parentMemberId) map.set(member.id, member.parentMemberId);
  }

  if (owner && !map.has(owner.id)) {
    if (father) map.set(owner.id, father.id);
    else if (mother) map.set(owner.id, mother.id);
  }

  for (const member of active) {
    const rel = member.relationship.trim().toLowerCase();
    if ((rel === 'brother' || rel === 'sister') && !map.has(member.id)) {
      if (father) map.set(member.id, father.id);
      else if (mother) map.set(member.id, mother.id);
    }
  }

  if (grandparent) {
    if (father && !map.has(father.id)) map.set(father.id, grandparent.id);
    if (mother && !map.has(mother.id)) map.set(mother.id, grandparent.id);
  }

  for (const member of active) {
    if (isChildRelationship(member.relationship) && !map.has(member.id) && owner) {
      map.set(member.id, owner.id);
    }
  }

  return map;
}

function arePartners(a: FamilyMember, b: FamilyMember): boolean {
  const aRel = a.relationship.trim().toLowerCase();
  const bRel = b.relationship.trim().toLowerCase();
  if ((a.role === 'owner' || aRel === 'self') && bRel === 'spouse') return true;
  if ((b.role === 'owner' || bRel === 'self') && aRel === 'spouse') return true;
  if ((aRel === 'father' && bRel === 'mother') || (aRel === 'mother' && bRel === 'father')) return true;
  return false;
}

/** Pair partners (owner+spouse, father+mother) on the same row. */
export function groupPartnerNodes(nodes: FamilyTreeNode[]): FamilyTreeNode[][] {
  const groups: FamilyTreeNode[][] = [];
  const used = new Set<string>();

  for (const node of nodes) {
    if (used.has(node.member.id)) continue;

    const partnerNode = nodes.find(
      (other) =>
        !used.has(other.member.id) &&
        other.member.id !== node.member.id &&
        arePartners(node.member, other.member),
    );

    if (partnerNode) {
      const pair = [node, partnerNode].sort((a, b) => memberTreeSort(a.member, b.member));
      groups.push(pair);
      used.add(node.member.id);
      used.add(partnerNode.member.id);
      continue;
    }

    groups.push([node]);
    used.add(node.member.id);
  }

  return groups;
}

/** @deprecated Use groupPartnerNodes */
export const groupPartnerRoots = groupPartnerNodes;

/** Build a recursive household tree with inferred parent links. */
export function buildFamilyTree(
  members: FamilyMember[],
  options?: { includeDisabled?: boolean },
): FamilyTreeNode[] {
  const active = options?.includeDisabled
    ? members
    : members.filter((m) => m.status !== 'disabled');
  const owner = getOwnerMember(active);
  const spouse = byRelationship(active, 'spouse');
  const spouseId = spouse && spouse.id !== owner?.id ? spouse.id : undefined;

  const treeMembers = spouseId ? active.filter((m) => m.id !== spouseId) : active;
  const parentMap = inferParentMap(treeMembers);
  const byId = new Map(treeMembers.map((m) => [m.id, m]));
  const childMap = new Map<string, FamilyMember[]>();
  const hasParent = new Set<string>();

  for (const member of treeMembers) {
    const parentId = parentMap.get(member.id);
    if (!parentId || parentId === member.id || !byId.has(parentId)) continue;
    hasParent.add(member.id);
    const siblings = childMap.get(parentId) ?? [];
    siblings.push(member);
    childMap.set(parentId, siblings);
  }

  const buildNode = (member: FamilyMember, ancestors: Set<string>): FamilyTreeNode => {
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(member.id);
    const children = (childMap.get(member.id) ?? [])
      .filter((child) => !nextAncestors.has(child.id))
      .map((child) => buildNode(child, nextAncestors));

    const partner =
      owner && member.id === owner.id && spouseId
        ? active.find((m) => m.id === spouseId)
        : undefined;

    return { member, partner, children };
  };

  const roots = treeMembers.filter((m) => !hasParent.has(m.id));
  return sortNodes(roots.map((member) => buildNode(member, new Set())));
}

/** Depth relative to the household owner (0 = owner generation). */
export function computeOwnerRelativeTiers(
  roots: FamilyTreeNode[],
  members: FamilyMember[],
): Map<string, number> {
  const owner = getOwnerMember(members);
  const depths = new Map<string, number>();

  const walk = (nodes: FamilyTreeNode[], depth: number) => {
    for (const node of nodes) {
      depths.set(node.member.id, depth);
      if (node.children.length > 0) walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);

  const ownerDepth = owner ? (depths.get(owner.id) ?? 0) : 0;
  const tiers = new Map<string, number>();

  for (const [id, depth] of depths) {
    tiers.set(id, depth - ownerDepth);
  }

  const spouse = byRelationship(members, 'spouse');
  if (spouse && spouse.id !== owner?.id) {
    tiers.set(spouse.id, 0);
  }

  return tiers;
}
