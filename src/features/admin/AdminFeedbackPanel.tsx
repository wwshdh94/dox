import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/format';
import type { FeedbackItem, FeedbackStatus } from '@/lib/feedback';
import {
  adminReplyToFeedback,
  adminSetFeedbackStatus,
  listAdminFeedback,
} from '@/features/admin/adminFeedbackOps';

const STATUS_OPTIONS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'closed', label: 'Closed' },
];

function statusBadge(status: FeedbackStatus): string {
  if (status === 'fixed') return 'bg-success/15 text-success';
  if (status === 'closed') return 'bg-bg-subtle text-muted';
  if (status === 'in_progress') return 'bg-warning/15 text-warning';
  return 'bg-accent-soft text-accent-ink';
}

export function AdminFeedbackPanel({ onComplete }: { onComplete: () => void }) {
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [tick, setTick] = useState(0);

  const items = useMemo(() => {
    void tick;
    return listAdminFeedback(filter);
  }, [filter, tick]);

  const selected = items.find((f) => f.id === selectedId) ?? items[0] ?? null;

  const refresh = () => {
    setTick((t) => t + 1);
    onComplete();
  };

  const setStatus = (item: FeedbackItem, status: FeedbackStatus) => {
    adminSetFeedbackStatus(item.id, status);
    refresh();
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    await adminReplyToFeedback(selected.id, reply);
    setReply('');
    refresh();
  };

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="section-label">User feedback</p>
          <p className="mt-0.5 text-xs text-muted">{items.length} thread(s)</p>
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FeedbackStatus | 'all');
            setSelectedId(null);
          }}
          className="min-h-9 rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-accent"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted">No feedback in this filter.</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setReply(item.adminReply ?? '');
                  }}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-bg-subtle ${
                    selected?.id === item.id ? 'bg-accent-soft/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text">{item.userName}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${statusBadge(item.status)}`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{item.userEmail}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{item.message}</p>
                  <p className="mt-1 text-[0.65rem] text-muted">{formatDate(item.createdAt)}</p>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-3 p-4">
          {!selected ? (
            <p className="text-sm text-muted">Select a thread to respond.</p>
          ) : (
            <>
              <div>
                <p className="font-medium text-text">{selected.userName}</p>
                <p className="text-xs text-muted">
                  {selected.userEmail} · {selected.category}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{selected.message}</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {(['in_progress', 'fixed', 'closed'] as FeedbackStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={selected.status === status ? 'primary' : 'ghost'}
                    className="!min-h-8 px-2 py-1 text-[0.65rem] capitalize"
                    onClick={() => setStatus(selected, status)}
                  >
                    {status.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>

              <label className="block text-xs font-medium text-muted">
                Reply (visible to this user only)
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Thanks for reporting — we fixed this in…"
                  className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </label>
              <Button
                className="!min-h-9 px-4 py-2 text-xs"
                onClick={sendReply}
                disabled={!reply.trim()}
              >
                Send reply
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
