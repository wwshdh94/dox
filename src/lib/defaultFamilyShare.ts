import { canManageDocumentFamilyAccess } from '@/lib/documentVisibility';
import { isDocumentReviewed } from '@/lib/documentReview';
import type { AppSettings, Document, FamilyMember, ShareGrant, User } from '@/types';

/** Joined family viewer who can receive per-document share grants. */
export function getFamilyViewerMember(members: FamilyMember[]): FamilyMember | undefined {
  return members.find((m) => m.role === 'viewer' && m.status !== 'disabled');
}

export function isDefaultFamilyShareEnabled(settings: AppSettings): boolean {
  return settings.defaultFamilyShare === true;
}

/** Member id to auto-grant family access, or null when default sharing should not apply. */
export function defaultFamilyShareGrantTarget(
  doc: Document,
  settings: AppSettings,
  members: FamilyMember[],
  user: User | null | undefined,
  documents: Document[],
  shareGrants: ShareGrant[],
): string | null {
  if (!isDefaultFamilyShareEnabled(settings)) return null;
  if (!isDocumentReviewed(doc)) return null;
  if (!canManageDocumentFamilyAccess(doc, members, user, documents)) return null;

  const viewer = getFamilyViewerMember(members);
  if (!viewer) return null;

  const alreadyShared = shareGrants.some(
    (g) => g.documentId === doc.id && g.memberId === viewer.id,
  );
  if (alreadyShared) return null;

  return viewer.id;
}
