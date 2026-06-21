import type { User } from '@/types';
import { FREE_DOC_LIMIT, isProUser } from '@/lib/planLimits';

/** Free tier base document allowance before referral bonuses. */
export const FREE_TIER_BASE_DOC_LIMIT = FREE_DOC_LIMIT;

/** Bonus uploads granted to referrer per successful referral. */
export const REFERRAL_BONUS_DOCS = 3;

/** Maximum bonus uploads earnable from referrals. */
export const REFERRAL_MAX_BONUS_DOCS = 15;

/** Uploads a referred user must complete to qualify their referrer. */
export const REFERRAL_QUALIFYING_UPLOADS = 5;

const LEDGER_KEY = 'prevault-referral-ledger';

export interface ReferralLedgerEntry {
  bonusDocsEarned: number;
  successfulReferrals: number;
  /** Referred user ids that already triggered a reward. */
  rewardedUserIds: string[];
}

export type ReferralLedger = Record<string, ReferralLedgerEntry>;

function emptyEntry(): ReferralLedgerEntry {
  return { bonusDocsEarned: 0, successfulReferrals: 0, rewardedUserIds: [] };
}

export function generateReferralCode(): string {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

export function readReferralLedger(): ReferralLedger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as ReferralLedger) : {};
  } catch {
    return {};
  }
}

export function writeReferralLedger(ledger: ReferralLedger): void {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

export function getLedgerEntry(code: string): ReferralLedgerEntry {
  const ledger = readReferralLedger();
  return ledger[code] ?? emptyEntry();
}

export function getBonusDocsForCode(code: string): number {
  return Math.min(getLedgerEntry(code).bonusDocsEarned, REFERRAL_MAX_BONUS_DOCS);
}

/** Effective document limit for free-tier users; null means unlimited. */
export function getDocumentLimit(user: User | null): number | null {
  if (!user || isProUser(user)) return null;
  const bonus = getBonusDocsForCode(user.referralCode);
  return FREE_TIER_BASE_DOC_LIMIT + bonus;
}

export function canUploadDocument(user: User | null, currentDocCount: number): boolean {
  const limit = getDocumentLimit(user);
  if (limit === null) return true;
  return currentDocCount < limit;
}

export function remainingUploads(user: User | null, currentDocCount: number): number | null {
  const limit = getDocumentLimit(user);
  if (limit === null) return null;
  return Math.max(0, limit - currentDocCount);
}

/**
 * Grant referrer bonus when a referred user completes qualifying uploads.
 * Returns true if a new reward was granted.
 */
export function grantReferralReward(
  referrerCode: string,
  referredUserId: string,
): boolean {
  if (!referrerCode || referrerCode.length < 4) return false;

  const ledger = readReferralLedger();
  const entry = ledger[referrerCode] ?? emptyEntry();

  if (entry.rewardedUserIds.includes(referredUserId)) return false;
  if (entry.bonusDocsEarned >= REFERRAL_MAX_BONUS_DOCS) return false;

  const nextBonus = Math.min(
    entry.bonusDocsEarned + REFERRAL_BONUS_DOCS,
    REFERRAL_MAX_BONUS_DOCS,
  );
  const granted = nextBonus - entry.bonusDocsEarned;
  if (granted <= 0) return false;

  ledger[referrerCode] = {
    bonusDocsEarned: nextBonus,
    successfulReferrals: entry.successfulReferrals + 1,
    rewardedUserIds: [...entry.rewardedUserIds, referredUserId],
  };
  writeReferralLedger(ledger);
  return true;
}

export function referralSignupUrl(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://prevault.app';
  return `${base}/login?ref=${encodeURIComponent(code)}`;
}

export function memberInviteUrl(referralCode: string, memberName: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://prevault.app';
  return `${base}/login?ref=${encodeURIComponent(referralCode)}&member=${encodeURIComponent(memberName)}`;
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailtoShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function referralInviteMessage(userName: string, code: string): string {
  const url = referralSignupUrl(code);
  return `${userName} invited you to PreVault — a private family document vault with expiry reminders.\n\nSign up: ${url}\n\nReferral code: ${code}`;
}

export function memberInviteMessage(
  inviterName: string,
  memberName: string,
  code: string,
): string {
  const url = memberInviteUrl(code, memberName);
  return `Hi ${memberName}, ${inviterName} invited you to join our family vault on PreVault.\n\nSign up here: ${url}`;
}

/** Persist ref code from URL until sign-in completes. */
export function stashPendingReferral(code: string | null): void {
  if (code) sessionStorage.setItem('prevault-pending-ref', code);
  else sessionStorage.removeItem('prevault-pending-ref');
}

export function consumePendingReferral(): string | undefined {
  const code = sessionStorage.getItem('prevault-pending-ref') ?? undefined;
  sessionStorage.removeItem('prevault-pending-ref');
  return code;
}
