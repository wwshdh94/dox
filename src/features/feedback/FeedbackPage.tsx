import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/format';
import {
  countUnreadFeedbackReplies,
  listFeedbackForUser,
  markFeedbackRepliesRead,
  submitFeedback,
  MIN_QUALITY_FEEDBACK_CHARS,
  isQualityFeedbackMessage,
  type FeedbackCategory,
  type FeedbackItem,
} from '@/lib/feedback';
import { MAX_FEEDBACK_MESSAGE_CHARS } from '@/lib/inputLimits';
import { canAccessLifetimeProProgram } from '@/lib/launchTasks';
import { notifyNewFeedback } from '@/lib/feedbackNotify';
import { useVaultStore } from '@/store/useVaultStore';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'billing', label: 'Billing' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABEL: Record<FeedbackItem['status'], string> = {
  open: 'Open',
  in_progress: 'In progress',
  fixed: 'Fixed',
  closed: 'Closed',
};

function statusTone(status: FeedbackItem['status']): string {
  if (status === 'fixed') return 'text-success';
  if (status === 'closed') return 'text-muted';
  if (status === 'in_progress') return 'text-warning';
  return 'text-accent-ink';
}

export function FeedbackPage() {
  const user = useVaultStore((s) => s.user);
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>(() =>
    user ? listFeedbackForUser(user.id) : [],
  );

  if (!user) return null;

  const refresh = () => {
    setItems(listFeedbackForUser(user.id));
    markFeedbackRepliesRead(user.id);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    const entry = submitFeedback({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      category,
      message,
      route: window.location.pathname,
    });
    await notifyNewFeedback(entry);
    setMessage('');
    setSent(true);
    refresh();
    window.setTimeout(() => setSent(false), 2500);
  };

  const unreadReplies = countUnreadFeedbackReplies(user.id);

  return (
    <div className="min-h-full pb-28">
      <Header title="Feedback" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <div className="surface-panel-elevated p-5">
          <p className="font-display text-xl text-text">Tell us what you think</p>
          <p className="mt-1 text-sm text-muted">
            Report bugs, request features, or ask for help. Our team replies here — only you can see
            your thread.
          </p>
          {canAccessLifetimeProProgram(user) && (
            <p className="mt-2 text-xs text-muted">
              Launch members: thoughtful feedback ({MIN_QUALITY_FEEDBACK_CHARS}+ characters) can count
              toward Lifetime Pro after admin approval.{' '}
              {isQualityFeedbackMessage(message)
                ? 'This draft qualifies on length.'
                : 'Add detail so we can act on it.'}
            </p>
          )}
        </div>

        <section className="surface-panel space-y-3 p-4">
          <p className="section-label">New message</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
            className="min-h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK_MESSAGE_CHARS))}
            maxLength={MAX_FEEDBACK_MESSAGE_CHARS}
            rows={4}
            placeholder="Describe the issue or suggestion…"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <p className="text-[0.65rem] text-muted">
            {message.length}/{MAX_FEEDBACK_MESSAGE_CHARS} characters
          </p>
          <Button className="w-full" onClick={handleSubmit} disabled={!message.trim()}>
            {sent ? 'Sent — thank you!' : 'Send feedback'}
          </Button>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="section-label">Your threads</p>
            {unreadReplies > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold text-accent-fg">
                {unreadReplies} new repl{unreadReplies === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted">No feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="surface-panel space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium capitalize text-text">
                        {item.category.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted">{formatDate(item.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold uppercase ${statusTone(item.status)}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-muted">{item.message}</p>
                  {item.adminReply ? (
                    <div className="rounded-xl border border-accent/25 bg-accent-soft/30 px-3 py-2">
                      <p className="text-xs font-semibold text-accent-ink">PreVault team</p>
                      <p className="mt-1 whitespace-pre-wrap text-text">{item.adminReply}</p>
                      {item.adminRepliedAt ? (
                        <p className="mt-1 text-[0.65rem] text-muted">
                          {formatDate(item.adminRepliedAt)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Waiting for a response…</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
