/** In-app platform messages queued by admin — demo localStorage; prod replaces with server inbox. */

export interface PlatformUpdate {
  id: string;
  userId: string | '*';
  title: string;
  body: string;
  at: string;
  read: boolean;
}

const UPDATES_KEY = 'prevault-platform-updates';
const MAX_UPDATES = 200;

function readUpdates(): PlatformUpdate[] {
  try {
    const raw = localStorage.getItem(UPDATES_KEY);
    return raw ? (JSON.parse(raw) as PlatformUpdate[]) : [];
  } catch {
    return [];
  }
}

function writeUpdates(updates: PlatformUpdate[]): void {
  localStorage.setItem(UPDATES_KEY, JSON.stringify(updates.slice(0, MAX_UPDATES)));
}

export function queuePlatformUpdate(input: {
  userId: string | '*';
  title: string;
  body: string;
}): PlatformUpdate {
  const entry: PlatformUpdate = {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title.trim(),
    body: input.body.trim(),
    at: new Date().toISOString(),
    read: false,
  };
  writeUpdates([entry, ...readUpdates()]);
  return entry;
}

export function listUnreadPlatformUpdates(userId: string): PlatformUpdate[] {
  return readUpdates().filter((u) => !u.read && (u.userId === '*' || u.userId === userId));
}

export function markPlatformUpdateRead(id: string): void {
  writeUpdates(readUpdates().map((u) => (u.id === id ? { ...u, read: true } : u)));
}

export function clearPlatformUpdates(): void {
  localStorage.removeItem(UPDATES_KEY);
}
