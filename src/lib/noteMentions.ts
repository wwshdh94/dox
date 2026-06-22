import type { FamilyMember } from '@/types';

export interface NoteMentionNotification {
  id: string;
  documentId: string;
  documentTitle: string;
  noteText: string;
  noteExcerpt: string;
  taggedMemberId: string;
  taggedMemberName: string;
  authorName: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
}

const MENTIONS_KEY = 'prevault-note-mentions';
const MAX_MENTIONS = 200;

function readMentions(): NoteMentionNotification[] {
  try {
    const raw = localStorage.getItem(MENTIONS_KEY);
    return raw ? (JSON.parse(raw) as NoteMentionNotification[]) : [];
  } catch {
    return [];
  }
}

function writeMentions(items: NoteMentionNotification[]): void {
  localStorage.setItem(MENTIONS_KEY, JSON.stringify(items.slice(0, MAX_MENTIONS)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match @DisplayName against active family members (longest names first). */
export function parseMentionedMemberIds(notes: string, members: FamilyMember[]): string[] {
  const text = notes.trim();
  if (!text) return [];

  const active = members
    .filter((m) => m.status !== 'disabled' && m.displayName.trim())
    .sort((a, b) => b.displayName.length - a.displayName.length);

  const found = new Set<string>();
  for (const member of active) {
    const name = member.displayName.trim();
    const re = new RegExp(`@${escapeRegExp(name)}(?=\\s|$|[.,!?;:])`, 'i');
    if (re.test(text)) {
      found.add(member.id);
    }
  }
  return [...found];
}

export function mentionSuggestions(query: string, members: FamilyMember[]): FamilyMember[] {
  const q = query.trim().toLowerCase();
  return members
    .filter((m) => m.status !== 'disabled' && m.displayName.trim())
    .filter((m) => !q || m.displayName.toLowerCase().includes(q))
    .slice(0, 6);
}

export function syncNoteMentions(input: {
  documentId: string;
  documentTitle: string;
  notes: string;
  members: FamilyMember[];
  authorName: string;
}): void {
  const noteText = input.notes.trim();
  if (!noteText) return;

  const taggedIds = parseMentionedMemberIds(noteText, input.members);
  if (taggedIds.length === 0) return;

  const existing = readMentions();
  const created: NoteMentionNotification[] = [];

  for (const memberId of taggedIds) {
    const member = input.members.find((m) => m.id === memberId);
    if (!member) continue;

    const duplicate = existing.some(
      (n) =>
        n.documentId === input.documentId &&
        n.taggedMemberId === memberId &&
        n.noteText === noteText &&
        !n.dismissed,
    );
    if (duplicate) continue;

    created.push({
      id: crypto.randomUUID(),
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      noteText,
      noteExcerpt: noteText.length > 120 ? `${noteText.slice(0, 117)}…` : noteText,
      taggedMemberId: memberId,
      taggedMemberName: member.displayName,
      authorName: input.authorName,
      createdAt: new Date().toISOString(),
      read: false,
      dismissed: false,
    });
  }

  if (created.length > 0) {
    writeMentions([...created, ...existing]);
  }
}

export function listMentionNotifications(includeDismissed = false): NoteMentionNotification[] {
  return readMentions()
    .filter((n) => includeDismissed || !n.dismissed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function countUnreadMentions(): number {
  return readMentions().filter((n) => !n.dismissed && !n.read).length;
}

export function markMentionRead(id: string): void {
  writeMentions(readMentions().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function dismissMention(id: string): void {
  writeMentions(
    readMentions().map((n) => (n.id === id ? { ...n, read: true, dismissed: true } : n)),
  );
}

export function clearMentions(): void {
  localStorage.removeItem(MENTIONS_KEY);
}
