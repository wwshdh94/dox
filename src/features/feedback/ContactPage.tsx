import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Input';
import { APP_SUPPORT_EMAIL } from '@/lib/appMeta';
import { MAX_CONTACT_SUBJECT_CHARS, MAX_FEEDBACK_MESSAGE_CHARS } from '@/lib/inputLimits';
import { submitFeedback, type FeedbackCategory } from '@/lib/feedback';
import { notifyNewFeedback } from '@/lib/feedbackNotify';
import { useVaultStore } from '@/store/useVaultStore';

type ContactTopic = 'general' | 'support' | 'privacy' | 'partnership' | 'other';

const TOPICS: { value: ContactTopic; label: string; category: FeedbackCategory }[] = [
  { value: 'general', label: 'General question', category: 'other' },
  { value: 'support', label: 'Help & support', category: 'account' },
  { value: 'privacy', label: 'Privacy & data', category: 'account' },
  { value: 'partnership', label: 'Partnership', category: 'other' },
  { value: 'other', label: 'Something else', category: 'other' },
];

export function ContactPage() {
  const user = useVaultStore((s) => s.user);
  const [topic, setTopic] = useState<ContactTopic>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const topicMeta = TOPICS.find((t) => t.value === topic) ?? TOPICS[0]!;
  const canSend = message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSend || busy) return;

    setBusy(true);
    const subjectLine = subject.trim();
    const body = [
      subjectLine ? `Subject: ${subjectLine}` : null,
      `Topic: ${topicMeta.label}`,
      '',
      message.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    const entry = submitFeedback({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      category: topicMeta.category,
      message: body,
      route: '/profile/contact',
    });

    await notifyNewFeedback(entry);
    setSubject('');
    setMessage('');
    setSent(true);
    setBusy(false);
    window.setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="min-h-full pb-28">
      <Header title="Contact us" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <div className="surface-panel-elevated p-5">
          <p className="font-display text-xl text-text">Reach the PreVault team</p>
          <p className="mt-1 text-sm text-muted">
            Questions about your vault, privacy, or getting started — we typically reply within one
            business day.
          </p>
          <p className="mt-2 text-xs text-muted">
            Prefer email?{' '}
            <a href={`mailto:${APP_SUPPORT_EMAIL}`} className="text-accent-ink">
              {APP_SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <section className="surface-panel space-y-4 p-4">
          <p className="section-label">Send a message</p>

          <div className="rounded-2xl border border-border bg-bg/50 px-4 py-3 text-sm">
            <p className="text-text">{user.name}</p>
            <p className="text-muted">{user.email}</p>
          </div>

          <Select
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value as ContactTopic)}
          >
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          <Input
            label="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary"
            maxLength={MAX_CONTACT_SUBJECT_CHARS}
          />

          <Textarea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK_MESSAGE_CHARS))}
            maxLength={MAX_FEEDBACK_MESSAGE_CHARS}
            rows={5}
            placeholder="How can we help?"
          />
          <p className="text-[0.65rem] text-muted">
            {message.length}/{MAX_FEEDBACK_MESSAGE_CHARS} characters
          </p>

          {message.trim().length > 0 && message.trim().length < 10 && (
            <p className="text-xs text-muted">Please add a bit more detail (at least 10 characters).</p>
          )}

          <Button className="w-full" onClick={() => void handleSubmit()} disabled={!canSend || busy}>
            {sent ? 'Sent — we’ll be in touch!' : busy ? 'Sending…' : 'Send message'}
          </Button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
