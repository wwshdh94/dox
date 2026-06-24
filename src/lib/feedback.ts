/** User feedback — stored platform-wide in demo localStorage; prod uses server + RLS. */

import { sanitizeFeedbackMessage } from '@/lib/inputLimits';

export type FeedbackCategory = 'bug' | 'feature' | 'billing' | 'account' | 'other';
export type FeedbackStatus = 'open' | 'in_progress' | 'fixed' | 'closed';

export interface FeedbackItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  route?: string;
  adminReply?: string;
  adminRepliedAt?: string;
  replyRead: boolean;
  /** Admin marked as good-quality feedback — counts toward Lifetime Pro task */
  adminQualityApproved?: boolean;
  adminQualityApprovedAt?: string;
}

const FEEDBACK_KEY = 'prevault-user-feedback';
const MAX_FEEDBACK = 300;

function readAll(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as FeedbackItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: FeedbackItem[]): void {
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items.slice(0, MAX_FEEDBACK)));
}

export function submitFeedback(input: {
  userId: string;
  userEmail: string;
  userName: string;
  category: FeedbackCategory;
  message: string;
  route?: string;
}): FeedbackItem {
  const now = new Date().toISOString();
  const entry: FeedbackItem = {
    id: crypto.randomUUID(),
    userId: input.userId,
    userEmail: input.userEmail.trim().toLowerCase(),
    userName: input.userName.trim(),
    category: input.category,
    message: sanitizeFeedbackMessage(input.message),
    status: 'open',
    createdAt: now,
    updatedAt: now,
    route: input.route,
    replyRead: true,
  };
  writeAll([entry, ...readAll()]);
  return entry;
}

/** Only the submitting user's feedback — never pass another userId from UI. */
export function listFeedbackForUser(userId: string): FeedbackItem[] {
  return readAll()
    .filter((f) => f.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function countUnreadFeedbackReplies(userId: string): number {
  return readAll().filter((f) => f.userId === userId && f.adminReply && !f.replyRead).length;
}

export function markFeedbackRepliesRead(userId: string): void {
  writeAll(
    readAll().map((f) =>
      f.userId === userId && f.adminReply ? { ...f, replyRead: true } : f,
    ),
  );
}

export function markFeedbackReplyRead(feedbackId: string): void {
  writeAll(readAll().map((f) => (f.id === feedbackId ? { ...f, replyRead: true } : f)));
}

/** Minimum message length for admin quality approval (Lifetime Pro task). */
export const MIN_QUALITY_FEEDBACK_CHARS = 50;

export function isQualityFeedbackMessage(message: string): boolean {
  return message.trim().length >= MIN_QUALITY_FEEDBACK_CHARS;
}

export function countAdminApprovedQualityFeedback(userId: string): number {
  return readAll().filter(
    (f) =>
      f.userId === userId &&
      f.adminQualityApproved === true &&
      isQualityFeedbackMessage(f.message),
  ).length;
}

export function clearFeedback(): void {
  localStorage.removeItem(FEEDBACK_KEY);
}

/** @internal Admin modules only — not for customer UI. */
export function __adminListAllFeedback(): FeedbackItem[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** @internal Admin modules only */
export function __adminUpdateFeedback(
  id: string,
  patch: Partial<
    Pick<
      FeedbackItem,
      'status' | 'adminReply' | 'adminRepliedAt' | 'replyRead' | 'adminQualityApproved' | 'adminQualityApprovedAt'
    >
  >,
): FeedbackItem | null {
  let updated: FeedbackItem | null = null;
  const now = new Date().toISOString();
  writeAll(
    readAll().map((f) => {
      if (f.id !== id) return f;
      updated = {
        ...f,
        ...patch,
        updatedAt: now,
        replyRead: patch.adminReply !== undefined ? false : (patch.replyRead ?? f.replyRead),
        adminRepliedAt:
          patch.adminReply !== undefined ? now : (patch.adminRepliedAt ?? f.adminRepliedAt),
        adminQualityApprovedAt:
          patch.adminQualityApproved === true
            ? now
            : patch.adminQualityApproved === false
              ? undefined
              : (patch.adminQualityApprovedAt ?? f.adminQualityApprovedAt),
      };
      return updated;
    }),
  );
  return updated;
}
