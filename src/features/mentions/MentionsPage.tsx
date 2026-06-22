import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { formatDate } from '@/lib/format';
import {
  dismissMention,
  listMentionNotifications,
  markMentionRead,
} from '@/lib/noteMentions';
import { useVaultStore } from '@/store/useVaultStore';
import { useState } from 'react';

export function MentionsPage() {
  const navigate = useNavigate();
  const members = useVaultStore((s) => s.members);
  const [tick, setTick] = useState(0);
  void tick;

  const items = listMentionNotifications();
  const refresh = () => setTick((t) => t + 1);

  const openDocument = (id: string, mentionId: string) => {
    markMentionRead(mentionId);
    refresh();
    navigate(`/documents/${id}`);
  };

  return (
    <div className="min-h-full pb-28">
      <Header title="Mentions" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        <div className="surface-panel-elevated p-5">
          <p className="font-display text-xl text-text">Notes that mention you</p>
          <p className="mt-1 text-sm text-muted">
            When someone tags a family member with @ in a note, it appears here so they can open the
            document and follow up.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted">No mentions yet. Add @name in a document note or quick note.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const member = members.find((m) => m.id === item.taggedMemberId);
              return (
                <li
                  key={item.id}
                  className={`surface-panel space-y-2 p-4 text-sm ${
                    !item.read ? 'border border-accent/30' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-text">
                        {item.authorName} mentioned{' '}
                        <span className="text-accent-ink">{item.taggedMemberName}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {item.documentTitle}
                        {member ? ` · ${member.relationship}` : ''} · {formatDate(item.createdAt)}
                      </p>
                    </div>
                    {!item.read ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[0.6rem] font-semibold text-accent-fg">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-muted">{item.noteExcerpt}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      className="!min-h-9 px-4 py-2 text-xs"
                      onClick={() => openDocument(item.documentId, item.id)}
                    >
                      View note
                    </Button>
                    <Button
                      variant="secondary"
                      className="!min-h-9 px-4 py-2 text-xs"
                      onClick={() => {
                        dismissMention(item.id);
                        refresh();
                      }}
                    >
                      Mark done
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[0.65rem] text-muted">
          Notes live on{' '}
          <Link to="/" className="text-accent-ink">
            document detail pages
          </Link>{' '}
          and quick notes from the + button on Family and Assets.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
