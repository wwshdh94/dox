import type { Asset, Document, FamilyMember, FamilyHomeView } from '@/types';

export type { FamilyHomeView };

export function getOwnerMember(members: FamilyMember[]): FamilyMember | undefined {
  return (
    members.find((m) => m.role === 'owner' && m.status !== 'disabled') ??
    members.find((m) => m.relationship === 'Self' && m.status !== 'disabled') ??
    members.find((m) => m.status !== 'disabled')
  );
}

export function getOtherFamilyMembers(members: FamilyMember[]): FamilyMember[] {
  const owner = getOwnerMember(members);
  return members.filter((m) => m.status !== 'disabled' && m.id !== owner?.id);
}

/** Two-letter initials from display name (e.g. Rahul Sharma → RS) */
export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Who owns this doc — one or more initials when filter shows all documents */
export function docOwnerInitials(
  doc: Document,
  members: FamilyMember[],
  assets: Asset[],
): string[] {
  const active = members.filter((m) => m.status !== 'disabled');

  if (doc.memberId) {
    const m = active.find((x) => x.id === doc.memberId);
    return m ? [memberInitials(m.displayName)] : [];
  }

  if (doc.assetId) {
    const asset = assets.find((a) => a.id === doc.assetId);
    if (asset?.ownedByMemberId) {
      const m = active.find((x) => x.id === asset.ownedByMemberId);
      return m ? [memberInitials(m.displayName)] : [];
    }
    // Asset without owner — household / shared vehicle etc.
    return active.map((m) => memberInitials(m.displayName));
  }

  // No member or asset — household common document
  return active.map((m) => memberInitials(m.displayName));
}
