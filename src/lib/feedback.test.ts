import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearFeedback,
  listFeedbackForUser,
  submitFeedback,
} from '@/lib/feedback';
import { adminReplyToFeedback, listAdminFeedback } from '@/features/admin/adminFeedbackOps';

describe('feedback', () => {
  beforeEach(() => {
    clearFeedback();
  });

  it('stores feedback scoped to user', () => {
    const item = submitFeedback({
      userId: 'u1',
      userEmail: 'a@test.com',
      userName: 'Alice',
      category: 'bug',
      message: 'Upload failed',
    });
    submitFeedback({
      userId: 'u2',
      userEmail: 'b@test.com',
      userName: 'Bob',
      category: 'feature',
      message: 'Dark mode',
    });

    expect(listFeedbackForUser('u1')).toHaveLength(1);
    expect(listFeedbackForUser('u1')[0].id).toBe(item.id);
    expect(listFeedbackForUser('u2')).toHaveLength(1);
  });

  it('admin reply is visible only to that user thread', async () => {
    const item = submitFeedback({
      userId: 'u1',
      userEmail: 'a@test.com',
      userName: 'Alice',
      category: 'bug',
      message: 'Crash on save',
    });

    await adminReplyToFeedback(item.id, 'Fixed in the latest build.');
    const mine = listFeedbackForUser('u1')[0];
    expect(mine.adminReply).toBe('Fixed in the latest build.');
    expect(mine.replyRead).toBe(false);
    expect(listAdminFeedback('all')).toHaveLength(1);
  });
});
