/** Platform moderation state — user read APIs only; writes live in admin modules. */

export interface UserBlockRecord {
  userId: string;
  email: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

export interface UserDiscountRecord {
  id: string;
  userId: string;
  email: string;
  code: string;
  label: string;
  percentOff: number;
  planTarget: 'pro' | 'family';
  grantedAt: string;
  expiresAt?: string;
  note?: string;
}

const BLOCKS_KEY = 'prevault-user-blocks';
const DISCOUNTS_KEY = 'prevault-user-discounts';

function readBlocks(): UserBlockRecord[] {
  try {
    const raw = localStorage.getItem(BLOCKS_KEY);
    return raw ? (JSON.parse(raw) as UserBlockRecord[]) : [];
  } catch {
    return [];
  }
}

function readDiscounts(): UserDiscountRecord[] {
  try {
    const raw = localStorage.getItem(DISCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as UserDiscountRecord[]) : [];
  } catch {
    return [];
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getUserBlock(userId: string, email?: string | null): UserBlockRecord | null {
  const blocks = readBlocks();
  const byId = blocks.find((b) => b.userId === userId);
  if (byId) return byId;
  if (!email) return null;
  const normalized = normalizeEmail(email);
  return blocks.find((b) => normalizeEmail(b.email) === normalized) ?? null;
}

export function isUserBlocked(userId: string, email?: string | null): boolean {
  return getUserBlock(userId, email) !== null;
}

export function getActiveDiscount(userId: string): UserDiscountRecord | null {
  const now = Date.now();
  const match = readDiscounts()
    .filter((d) => d.userId === userId)
    .sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())
    .find((d) => !d.expiresAt || new Date(d.expiresAt).getTime() > now);
  return match ?? null;
}

export function formatDiscountPrice(baseInr: number, percentOff: number): number {
  return Math.round(baseInr * (1 - percentOff / 100));
}

export function clearUserModeration(): void {
  localStorage.removeItem(BLOCKS_KEY);
  localStorage.removeItem(DISCOUNTS_KEY);
}

/** @internal Admin modules only */
export function __adminWriteBlocks(blocks: UserBlockRecord[]): void {
  localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
}

/** @internal Admin modules only */
export function __adminReadBlocks(): UserBlockRecord[] {
  return readBlocks();
}

/** @internal Admin modules only */
export function __adminWriteDiscounts(discounts: UserDiscountRecord[]): void {
  localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(discounts));
}

/** @internal Admin modules only */
export function __adminReadDiscounts(): UserDiscountRecord[] {
  return readDiscounts();
}
