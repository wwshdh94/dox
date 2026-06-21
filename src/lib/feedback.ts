/** User feedback — stored platform-wide in demo localStorage; prod uses server + RLS. */

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
    message: input.message.trim(),
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
  patch: Partial<Pick<FeedbackItem, 'status' | 'adminReply' | 'adminRepliedAt' | 'replyRead'>>,
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
      };
      return updated;
    }),
  );
  return updated;
}
