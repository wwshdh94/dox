/** Optional webhook for admin ops — same env as limit alerts (`VITE_ADMIN_NOTIFY_WEBHOOK`). */

export async function postAdminWebhook(body: Record<string, unknown>): Promise<boolean> {
  const webhook = import.meta.env.VITE_ADMIN_NOTIFY_WEBHOOK as string | undefined;
  if (!webhook) return false;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return true;
  } catch {
    return false;
  }
}
