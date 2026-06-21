import { useState } from 'react';
import { listUnreadPlatformUpdates, markPlatformUpdateRead } from '@/lib/platformUpdates';

export function PlatformUpdateBanner({ userId }: { userId: string }) {
  const [dismissed, setDismissed] = useState(false);
  const unread = listUnreadPlatformUpdates(userId);
  if (dismissed || unread.length === 0) return null;

  const latest = unread[0];

  return (
    <div className="mb-4 rounded-2xl border border-accent/30 bg-accent-soft/30 px-4 py-3 text-sm">
      <p className="font-semibold text-text">{latest.title}</p>
      <p className="mt-1 whitespace-pre-wrap text-muted">{latest.body}</p>
      <button
        type="button"
        className="mt-2 text-xs font-semibold text-accent hover:underline"
        onClick={() => {
          for (const u of unread) {
            markPlatformUpdateRead(u.id);
          }
          setDismissed(true);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
