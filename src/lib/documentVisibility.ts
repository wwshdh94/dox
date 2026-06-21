import { getOwnerMember, getSessionMember } from '@/lib/family';
import { memberHasJoined } from '@/lib/memberActivity';
import { docsForMemberByDomain } from '@/lib/docTags';
import {
  isGuardianOfMember,
  memberIsMinor,
} from '@/lib/memberRelations';
import type { DocDomain, Document, FamilyMember, ShareGrant, User } from '@/types';

export function documentHasFamilyAccess(documentId: string, shareGrants: ShareGrant[]): boolean {
  return shareGrants.some((g) => g.documentId === documentId);
}

function documentOwnerMember(doc: Document, members: FamilyMember[]): FamilyMember | undefined {
  if (!doc.memberId) return undefined;
  return members.find((m) => m.id === doc.memberId && m.status !== 'disabled');
}

function minorDocGuardianAccess(
  docOwner: FamilyMember,
  sessionMember: FamilyMember,
  members: FamilyMember[],
  documents: Document[],
): boolean {
  if (!memberIsMinor(docOwner, documents)) return false;
  return isGuardianOfMember(sessionMember, docOwner, members);
}

/** Who may toggle family access for this document. */
export function canManageDocumentFamilyAccess(
  doc: Document,
  members: FamilyMember[],
  user: User | null | undefined,
  documents: Document[],
): boolean {
  const sessionMember = getSessionMember(members, user);
  if (!sessionMember) return false;

  const docOwner = documentOwnerMember(doc, members);
  if (!docOwner) {
    return sessionMember.role === 'owner';
  }

  if (memberIsMinor(docOwner, documents)) {
    return isGuardianOfMember(sessionMember, docOwner, members);
  }

  if (sessionMember.id === docOwner.id) return true;

  const vaultOwner = getOwnerMember(members);
  if (vaultOwner && sessionMember.id === vaultOwner.id && !memberHasJoined(docOwner)) {
    return true;
  }

  return false;
}

/** Whether the signed-in member may open this document. */
export function canViewDocument(
  doc: Document,
  members: FamilyMember[],
  user: User | null | undefined,
  shareGrants: ShareGrant[],
  documents: Document[],
): boolean {
  if (doc.archivedAt) return false;

  const sessionMember = getSessionMember(members, user);
  if (!sessionMember) return false;

  const docOwner = documentOwnerMember(doc, members);

  if (docOwner && memberIsMinor(docOwner, documents)) {
    if (sessionMember.id === docOwner.id) return true;
    return minorDocGuardianAccess(docOwner, sessionMember, members, documents);
  }

  if (docOwner && sessionMember.id === docOwner.id) return true;

  if (!docOwner) return true;

  const vaultOwner = getOwnerMember(members);
  if (vaultOwner && sessionMember.id === vaultOwner.id && !memberHasJoined(docOwner)) {
    return true;
  }

  if (!documentHasFamilyAccess(doc.id, shareGrants)) return false;

  return shareGrants.some(
    (g) => g.documentId === doc.id && g.memberId === sessionMember.id,
  );
}

export function visibleMemberFamilyDocs(
  documents: Document[],
  vaultMemberId: string,
  members: FamilyMember[],
  user: User | null | undefined,
  shareGrants: ShareGrant[],
  domain: DocDomain = 'family',
): Document[] {
  return docsForMemberByDomain(documents, vaultMemberId, domain).filter((doc) =>
    canViewDocument(doc, members, user, shareGrants, documents),
  );
}

export function isMinorManagedDocument(
  doc: Document,
  members: FamilyMember[],
  documents: Document[],
): boolean {
  const docOwner = documentOwnerMember(doc, members);
  return Boolean(docOwner && memberIsMinor(docOwner, documents));
}

/** Who may edit, share, review, archive, renew, or delete this document. */
export function canManageDocument(
  doc: Document,
  members: FamilyMember[],
  user: User | null | undefined,
  documents: Document[],
): boolean {
  const sessionMember = getSessionMember(members, user);
  if (!sessionMember) return false;

  const docOwner = documentOwnerMember(doc, members);
  if (!docOwner) {
    return sessionMember.role === 'owner';
  }

  if (memberIsMinor(docOwner, documents)) {
    return isGuardianOfMember(sessionMember, docOwner, members);
  }

  if (sessionMember.id === docOwner.id) return true;

  const vaultOwner = getOwnerMember(members);
  if (vaultOwner && sessionMember.id === vaultOwner.id && !memberHasJoined(docOwner)) {
    return true;
  }

  return false;
}

/** Who may permanently delete this document. */
export function canDeleteDocument(
  doc: Document,
  members: FamilyMember[],
  user: User | null | undefined,
  documents: Document[],
): boolean {
  return canManageDocument(doc, members, user, documents);
}
