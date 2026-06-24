import { isHealthDomainDoc } from '@/lib/docTags';
import { canViewDocument } from '@/lib/documentVisibility';
import {
  getDocumentsNeedingReview,
  normalizeReviewStatus,
  REVIEW_STATUS_LABELS,
  reviewStatusActionHint,
} from '@/lib/documentReview';
import { countUnreadFeedbackReplies, listFeedbackForUser, markFeedbackReplyRead } from '@/lib/feedback';
import { getOwnerMember } from '@/lib/family';
import { daysUntil, formatDate } from '@/lib/format';
import { EXPIRY_SNOOZE_MS, isInboxNotificationSnoozed, REVIEW_SNOOZE_MS, snoozeInboxNotification } from '@/lib/inboxSnooze';
import { dismissMention, listMentionNotifications, markMentionRead } from '@/lib/noteMentions';
import { listUnreadPlatformUpdates, markPlatformUpdateRead } from '@/lib/platformUpdates';
import { getExpiringDocuments } from '@/store/useVaultStore';
import type { Document, FamilyHomeView, FamilyMember, ShareGrant, User } from '@/types';

export type InboxNotificationType =
  | 'mention'
  | 'platform_update'
  | 'feedback_reply'
  | 'document_review'
  | 'expiring_soon'
  | 'health_insurance_expiring';

export interface InboxNotification {
  id: string;
  type: InboxNotificationType;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  href: string;
  sourceId: string;
}

export interface VaultInboxContext {
  documents: Document[];
  members: FamilyMember[];
  user: User | null;
  shareGrants: ShareGrant[];
  familyHomeView?: FamilyHomeView;
}

function docLabel(doc: Document): string {
  return doc.title?.trim() || doc.docType.replace(/_/g, ' ');
}

function memberName(members: FamilyMember[], memberId?: string): string | undefined {
  if (!memberId) return undefined;
  return members.find((m) => m.id === memberId)?.displayName;
}

function visibleDocuments(ctx: VaultInboxContext): Document[] {
  return ctx.documents.filter(
    (d) =>
      !d.archivedAt && canViewDocument(d, ctx.members, ctx.user, ctx.shareGrants, ctx.documents),
  );
}

function visibleFamilyDocuments(ctx: VaultInboxContext): Document[] {
  return visibleDocuments(ctx).filter((d) => !isHealthDomainDoc(d));
}

function scopedHealthInsurance(ctx: VaultInboxContext): Document[] {
  const owner = getOwnerMember(ctx.members);
  const insurance = visibleDocuments(ctx).filter((d) => d.docType === 'health_insurance');
  if (ctx.familyHomeView === 'me' && owner) {
    return insurance.filter((d) => d.memberId === owner.id);
  }
  return insurance;
}

function expiryBody(doc: Document, members: FamilyMember[]): string {
  const days = daysUntil(doc.expiryDate!);
  const member = memberName(members, doc.memberId);
  const when =
    days < 0
      ? 'Expired'
      : days === 0
        ? 'Expires today'
        : days === 1
          ? 'Expires tomorrow'
          : `${days} days left`;
  const date = formatDate(doc.expiryDate!);
  return member ? `${when} · ${date} · ${member}` : `${when} · ${date}`;
}

export function buildVaultAlertNotifications(ctx: VaultInboxContext): InboxNotification[] {
  const items: InboxNotification[] = [];
  const familyDocs = visibleFamilyDocuments(ctx);

  for (const doc of getDocumentsNeedingReview(familyDocs)) {
    const status = normalizeReviewStatus(doc);
    items.push({
      id: `review-${doc.id}`,
      type: 'document_review',
      title: `${docLabel(doc)} — ${REVIEW_STATUS_LABELS[status]}`,
      body: reviewStatusActionHint(status) || 'Open the document to continue.',
      at: doc.updatedAt || doc.createdAt,
      unread: true,
      href: status === 'pending_details' ? `/upload?edit=${doc.id}` : `/documents/${doc.id}`,
      sourceId: doc.id,
    });
  }

  for (const doc of getExpiringDocuments(familyDocs)) {
    items.push({
      id: `expiring-${doc.id}`,
      type: 'expiring_soon',
      title: `${docLabel(doc)} expiring soon`,
      body: expiryBody(doc, ctx.members),
      at: doc.expiryDate!,
      unread: true,
      href: `/documents/${doc.id}`,
      sourceId: doc.id,
    });
  }

  const expiringHealth = getExpiringDocuments(scopedHealthInsurance(ctx), 60);
  for (const doc of expiringHealth) {
    items.push({
      id: `health-expiring-${doc.id}`,
      type: 'health_insurance_expiring',
      title: 'Health insurance renewal due',
      body: `${docLabel(doc)} · ${expiryBody(doc, ctx.members)}`,
      at: doc.expiryDate!,
      unread: true,
      href: `/documents/${doc.id}`,
      sourceId: doc.id,
    });
  }

  return items.filter((item) => !isInboxNotificationSnoozed(item.id));
}

export function countVaultAlertNotifications(ctx: VaultInboxContext): number {
  return buildVaultAlertNotifications(ctx).length;
}

export function inboxDismissLabel(type: InboxNotificationType): string {
  switch (type) {
    case 'document_review':
      return 'Dismiss review alert for 1 day';
    case 'expiring_soon':
    case 'health_insurance_expiring':
      return 'Dismiss expiry alert for 3 days';
    default:
      return 'Mark as read';
  }
}

export function dismissInboxNotification(item: InboxNotification): void {
  switch (item.type) {
    case 'document_review':
      snoozeInboxNotification(item.id, REVIEW_SNOOZE_MS);
      break;
    case 'expiring_soon':
    case 'health_insurance_expiring':
      snoozeInboxNotification(item.id, EXPIRY_SNOOZE_MS);
      break;
    case 'mention':
      dismissMention(item.sourceId);
      break;
    case 'platform_update':
      markPlatformUpdateRead(item.sourceId);
      break;
    case 'feedback_reply':
      markFeedbackReplyRead(item.sourceId);
      break;
  }
}

export function buildInboxNotifications(userId: string, vault?: VaultInboxContext): InboxNotification[] {
  const items: InboxNotification[] = [];

  for (const m of listMentionNotifications()) {
    if (m.dismissed || m.read) continue;
    items.push({
      id: `mention-${m.id}`,
      type: 'mention',
      title: `${m.authorName} mentioned ${m.taggedMemberName}`,
      body: m.noteExcerpt,
      at: m.createdAt,
      unread: true,
      href: `/documents/${m.documentId}`,
      sourceId: m.id,
    });
  }

  for (const u of listUnreadPlatformUpdates(userId)) {
    items.push({
      id: `update-${u.id}`,
      type: 'platform_update',
      title: u.title,
      body: u.body,
      at: u.at,
      unread: true,
      href: '/',
      sourceId: u.id,
    });
  }

  for (const f of listFeedbackForUser(userId)) {
    if (!f.adminReply || f.replyRead) continue;
    items.push({
      id: `feedback-${f.id}`,
      type: 'feedback_reply',
      title: 'Reply from PreVault team',
      body: f.adminReply,
      at: f.adminRepliedAt ?? f.updatedAt,
      unread: true,
      href: '/profile/feedback',
      sourceId: f.id,
    });
  }

  if (vault) {
    items.push(...buildVaultAlertNotifications(vault));
  }

  return items
    .filter((item) => !isInboxNotificationSnoozed(item.id))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function countUnreadInbox(userId: string, vault?: VaultInboxContext): number {
  return (
    listMentionNotifications().filter((m) => !m.dismissed && !m.read).length +
    listUnreadPlatformUpdates(userId).length +
    countUnreadFeedbackReplies(userId) +
    (vault ? countVaultAlertNotifications(vault) : 0)
  );
}

export function handleInboxNotificationTap(item: InboxNotification): void {
  switch (item.type) {
    case 'mention':
      markMentionRead(item.sourceId);
      break;
    case 'platform_update':
      markPlatformUpdateRead(item.sourceId);
      break;
    case 'feedback_reply':
      markFeedbackReplyRead(item.sourceId);
      break;
    case 'document_review':
    case 'expiring_soon':
    case 'health_insurance_expiring':
      break;
  }
}
