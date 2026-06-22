import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearMentions,
  parseMentionedMemberIds,
  syncNoteMentions,
  listMentionNotifications,
} from '@/lib/noteMentions';
import type { FamilyMember } from '@/types';

const members: FamilyMember[] = [
  {
    id: 'm1',
    displayName: 'Rahul Sharma',
    relationship: 'Self',
    status: 'active',
    role: 'owner',
  },
  {
    id: 'm2',
    displayName: 'Priya Sharma',
    relationship: 'Spouse',
    status: 'active',
    role: 'viewer',
  },
];

describe('noteMentions', () => {
  beforeEach(() => {
    clearMentions();
  });

  it('parses @display names in note text', () => {
    const ids = parseMentionedMemberIds('Please review insurance for @Priya Sharma tomorrow', members);
    expect(ids).toEqual(['m2']);
  });

  it('creates a notification when a member is mentioned', () => {
    syncNoteMentions({
      documentId: 'd1',
      documentTitle: 'Insurance note',
      notes: 'Renew policy for @Priya Sharma',
      members,
      authorName: 'Rahul Sharma',
    });
    const items = listMentionNotifications();
    expect(items).toHaveLength(1);
    expect(items[0].taggedMemberId).toBe('m2');
    expect(items[0].documentId).toBe('d1');
  });
});
