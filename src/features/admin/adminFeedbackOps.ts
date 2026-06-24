import { appendAdminEvent } from '@/lib/adminEvents';
import { postAdminWebhook } from '@/lib/adminWebhook';
import {
  __adminListAllFeedback,
  __adminUpdateFeedback,
  isQualityFeedbackMessage,
  type FeedbackItem,
  type FeedbackStatus,
} from '@/lib/feedback';

export function listAdminFeedback(status?: FeedbackStatus | 'all'): FeedbackItem[] {
  const items = __adminListAllFeedback();
  if (!status || status === 'all') return items;
  return items.filter((f) => f.status === status);
}

export function countOpenFeedback(): number {
  return __adminListAllFeedback().filter((f) => f.status === 'open' || f.status === 'in_progress')
    .length;
}

export async function adminReplyToFeedback(id: string, reply: string): Promise<FeedbackItem | null> {
  const trimmed = reply.trim();
  if (!trimmed) return null;

  const updated = __adminUpdateFeedback(id, { adminReply: trimmed, status: 'in_progress' });
  if (!updated) return null;

  await postAdminWebhook({
    event: 'feedback_replied',
    at: new Date().toISOString(),
    feedbackId: id,
    userId: updated.userId,
    userEmail: updated.userEmail,
  });

  appendAdminEvent({
    type: 'feedback_replied',
    householdUserId: updated.userId,
    householdEmail: updated.userEmail,
    meta: { feedbackId: id },
  });

  return updated;
}

export function adminSetFeedbackStatus(id: string, status: FeedbackStatus): FeedbackItem | null {
  const updated = __adminUpdateFeedback(id, { status });
  if (!updated) return null;

  return updated;
}

export function adminApproveFeedbackQuality(id: string): FeedbackItem | null {
  const items = __adminListAllFeedback();
  const item = items.find((f) => f.id === id);
  if (!item) return null;
  if (!isQualityFeedbackMessage(item.message)) return null;

  const updated = __adminUpdateFeedback(id, { adminQualityApproved: true });
  if (!updated) return null;

  appendAdminEvent({
    type: 'feedback_quality_approved',
    householdUserId: updated.userId,
    householdEmail: updated.userEmail,
    meta: { feedbackId: id },
  });

  return updated;
}

export function adminRevokeFeedbackQuality(id: string): FeedbackItem | null {
  return __adminUpdateFeedback(id, {
    adminQualityApproved: false,
    adminQualityApprovedAt: undefined,
  });
}
