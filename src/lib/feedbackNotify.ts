import { appendAdminEvent } from '@/lib/adminEvents';
import { postAdminWebhook } from '@/lib/adminWebhook';
import type { FeedbackItem } from '@/lib/feedback';

/** Called when a user submits feedback — no admin UI imports. */
export async function notifyNewFeedback(item: FeedbackItem): Promise<void> {
  await postAdminWebhook({
    event: 'feedback_received',
    at: item.createdAt,
    feedbackId: item.id,
    userId: item.userId,
    userEmail: item.userEmail,
    category: item.category,
    message: item.message.slice(0, 500),
  });

  appendAdminEvent({
    type: 'feedback_received',
    householdUserId: item.userId,
    householdEmail: item.userEmail,
    meta: { feedbackId: item.id, category: item.category },
  });
}
