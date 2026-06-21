import { appendAdminEvent } from '@/lib/adminEvents';
import type { PlatformHousehold } from '@/lib/adminPlatformRegistry';
import { updateHouseholdPlan } from '@/lib/adminPlatformRegistry';
import { postAdminWebhook } from '@/lib/adminWebhook';
import { queuePlatformUpdate } from '@/lib/platformUpdates';
import type { User } from '@/types';

export interface AdminComposePayload {
  title: string;
  body: string;
}

function logDev(action: string, payload: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(`[PreVault admin] ${action}`, payload);
  }
}

/** Open default mail client to contact a household owner. */
export function adminEmailHousehold(
  household: PlatformHousehold,
  opts?: { subject?: string; body?: string },
): void {
  const subject = opts?.subject?.trim() || 'PreVault support';
  const body =
    opts?.body?.trim() ||
    `Hi ${household.name},\n\n\n— PreVault team`;
  const params = new URLSearchParams({ subject, body });
  window.location.href = `mailto:${encodeURIComponent(household.email)}?${params.toString()}`;

  appendAdminEvent({
    type: 'admin_email',
    householdUserId: household.userId,
    householdEmail: household.email,
    meta: { subject },
  });
  logDev('admin_email', { email: household.email, subject });
}

/** Queue push — webhook in prod; demo shows a browser notification for the active vault user. */
export async function adminPushHousehold(
  household: PlatformHousehold,
  payload: AdminComposePayload,
  currentUserId?: string | null,
): Promise<void> {
  const title = payload.title.trim() || 'PreVault';
  const body = payload.body.trim() || 'You have a new message from PreVault.';

  await postAdminWebhook({
    event: 'admin_push',
    at: new Date().toISOString(),
    householdUserId: household.userId,
    householdEmail: household.email,
    title,
    body,
  });

  if (currentUserId && currentUserId === household.userId && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
        }
      }
    } catch {
      // Demo only — never block admin UI
    }
  }

  appendAdminEvent({
    type: 'admin_push',
    householdUserId: household.userId,
    householdEmail: household.email,
    meta: { title },
  });
  logDev('admin_push', { userId: household.userId, title });
}

/** Deliver an in-app platform update to one household or everyone (`*`). */
export async function adminSendPlatformUpdate(
  target: PlatformHousehold | '*',
  payload: AdminComposePayload,
): Promise<void> {
  const title = payload.title.trim() || 'PreVault update';
  const body = payload.body.trim();
  if (!body) return;

  const userId = target === '*' ? '*' : target.userId;
  queuePlatformUpdate({ userId, title, body });

  await postAdminWebhook({
    event: 'admin_update',
    at: new Date().toISOString(),
    userId,
    householdEmail: target === '*' ? undefined : target.email,
    title,
    body,
  });

  appendAdminEvent({
    type: 'admin_update',
    householdUserId: target === '*' ? undefined : target.userId,
    householdEmail: target === '*' ? undefined : target.email,
    meta: { title, broadcast: target === '*' },
  });
  logDev('admin_update', { userId, title });
}

/** Change plan in platform registry; applies to active vault when user ids match. */
export function adminSetHouseholdPlan(
  household: PlatformHousehold,
  plan: User['plan'],
  applyToVault?: (plan: User['plan']) => void,
): void {
  const previous = household.plan;
  if (previous === plan) return;

  updateHouseholdPlan(household.userId, plan);
  applyToVault?.(plan);

  appendAdminEvent({
    type: 'plan_change',
    householdUserId: household.userId,
    householdEmail: household.email,
    plan,
    meta: { previousPlan: previous, source: 'admin' },
  });
  logDev('admin_plan_change', { userId: household.userId, plan, previous });
}
