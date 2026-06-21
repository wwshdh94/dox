import { useState } from 'react';
import { Button } from '@/components/Button';
import { adminSendPlatformUpdate } from '@/lib/adminActions';
import { listPlatformHouseholds } from '@/lib/adminPlatformRegistry';

export function AdminBroadcastPanel({ onComplete }: { onComplete: () => void }) {
  const [title, setTitle] = useState('PreVault update');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const householdCount = listPlatformHouseholds().length;

  const broadcast = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await adminSendPlatformUpdate('*', { title, body });
      setBody('');
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
      <p className="section-label">Broadcast update</p>
      <p className="mt-1 text-xs text-muted">
        Send an in-app message to all {householdCount} registered household(s). Users see it on Profile.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted sm:col-span-2">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        <label className="block text-xs font-medium text-muted sm:col-span-2">
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="New features, maintenance window, policy changes…"
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          className="!min-h-9 px-4 py-2 text-xs"
          onClick={broadcast}
          disabled={busy || !body.trim()}
        >
          Send to all
        </Button>
      </div>
    </section>
  );
}
