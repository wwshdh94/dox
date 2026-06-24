import type { Asset, Document, FamilyMember, User } from '@/types';
import { getOwnerMember } from '@/lib/family';
import { canUploadDocument } from '@/lib/referrals';
import { isDocumentReviewed } from '@/lib/documentReview';
import { canStageDocument, countVerifiedDocuments } from '@/lib/verificationQueue';

/** Hard production cap per family member — all plans, incl. Pro. Not shown in marketing UI. */
export const PRODUCTION_MAX_DOCS_PER_MEMBER = 50;

export type DocumentLimitBlockReason = 'plan' | 'member_cap' | 'pending_queue';

export interface DocumentLimitCheck {
  allowed: boolean;
  reason?: DocumentLimitBlockReason;
  memberId?: string;
  memberCount?: number;
}

type DocRef = Pick<Document, 'memberId' | 'assetId'>;

/** Resolve which member “owns” storage quota for a document. */
export function resolveDocumentMemberId(
  doc: DocRef,
  assets: Asset[],
  members: FamilyMember[],
): string | undefined {
  if (doc.memberId) return doc.memberId;
  if (doc.assetId) {
    const asset = assets.find((a) => a.id === doc.assetId);
    if (asset?.ownedByMemberId) return asset.ownedByMemberId;
  }
  return getOwnerMember(members)?.id;
}

export function countDocumentsForMember(
  documents: Document[],
  assets: Asset[],
  members: FamilyMember[],
  memberId: string,
): number {
  return documents.filter(
    (d) => resolveDocumentMemberId(d, assets, members) === memberId,
  ).length;
}

export function membersAtDocumentCap(
  documents: Document[],
  assets: Asset[],
  members: FamilyMember[],
): { memberId: string; count: number }[] {
  return members
    .filter((m) => m.status !== 'disabled')
    .map((m) => ({
      memberId: m.id,
      count: countDocumentsForMember(documents, assets, members, m.id),
    }))
    .filter((x) => x.count >= PRODUCTION_MAX_DOCS_PER_MEMBER);
}

export function checkCanAddDocument(
  user: User | null,
  documents: Document[],
  assets: Asset[],
  members: FamilyMember[],
  target: DocRef & { reviewStatus?: Document['reviewStatus']; verificationStatus?: Document['verificationStatus'] },
): DocumentLimitCheck {
  const memberId = resolveDocumentMemberId(target, assets, members);
  if (!memberId) {
    return { allowed: false, reason: 'member_cap' };
  }

  const memberCount = countDocumentsForMember(documents, assets, members, memberId);
  if (memberCount >= PRODUCTION_MAX_DOCS_PER_MEMBER) {
    return { allowed: false, reason: 'member_cap', memberId, memberCount };
  }

  if (target.reviewStatus === 'processing' || target.reviewStatus === 'under_review' || target.reviewStatus === 'pending_details' || target.verificationStatus === 'pending') {
    if (!canStageDocument(user, documents)) {
      return { allowed: false, reason: 'pending_queue' };
    }
    return { allowed: true, memberId, memberCount };
  }

  if (!canUploadDocument(user, countVerifiedDocuments(documents))) {
    return { allowed: false, reason: 'plan', memberId, memberCount };
  }

  return { allowed: true, memberId, memberCount };
}

export function checkCanVerifyDocument(
  user: User | null,
  documents: Document[],
  doc: Document,
): DocumentLimitCheck {
  if (isDocumentReviewed(doc)) {
    return { allowed: false, reason: 'plan' };
  }
  if (!canUploadDocument(user, countVerifiedDocuments(documents))) {
    return { allowed: false, reason: 'plan' };
  }
  return { allowed: true };
}

export function memberCapReachedAfterAdd(memberCount: number): boolean {
  return memberCount >= PRODUCTION_MAX_DOCS_PER_MEMBER;
}
