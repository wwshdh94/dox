import { useMemo, useRef, useState } from 'react';
import type { FamilyMember } from '@/types';
import { MAX_DOCUMENT_NOTES_CHARS } from '@/lib/inputLimits';
import { mentionSuggestions } from '@/lib/noteMentions';

export function MentionTextarea({
  label,
  value,
  onChange,
  onBlur,
  members,
  placeholder,
  autoFocus,
  maxLength = MAX_DOCUMENT_NOTES_CHARS,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  members: FamilyMember[];
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');

  const suggestions = useMemo(
    () => (mentionStart === null ? [] : mentionSuggestions(mentionQuery, members)),
    [mentionStart, mentionQuery, members],
  );

  const updateMentionState = (text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const match = before.match(/@([^\s@]*)$/);
    if (match) {
      setMentionStart(cursor - match[0].length);
      setMentionQuery(match[1]);
    } else {
      setMentionStart(null);
      setMentionQuery('');
    }
  };

  const insertMention = (member: FamilyMember) => {
    if (mentionStart === null || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const insertion = `@${member.displayName} `;
    const next = `${before}${insertion}${after}`;
    onChange(next);
    setMentionStart(null);
    setMentionQuery('');
    requestAnimationFrame(() => {
      const pos = before.length + insertion.length;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  };

  return (
    <label className="relative block space-y-2">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
      <textarea
        ref={textareaRef}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'Type @ to mention a family member'}
        onChange={(e) => {
          const next = e.target.value.slice(0, maxLength);
          onChange(next);
          updateMentionState(next, Math.min(e.target.selectionStart ?? next.length, next.length));
        }}
        onClick={(e) =>
          updateMentionState(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
        }
        onKeyUp={(e) =>
          updateMentionState(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
        }
        onBlur={() => {
          window.setTimeout(() => {
            setMentionStart(null);
            onBlur?.();
          }, 150);
        }}
        className="min-h-28 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-soft"
        maxLength={maxLength}
      />
      {suggestions.length > 0 ? (
        <ul className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated py-1 shadow-lg">
          {suggestions.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent-soft/50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
              >
                <span className="font-medium text-text">{member.displayName}</span>
                <span className="ml-2 text-xs text-muted">{member.relationship}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[0.65rem] text-muted">
        Use @name to notify a family member. {value.length}/{maxLength} characters.
      </p>
    </label>
  );
}

export function MentionNoteText({ text, members }: { text: string; members: FamilyMember[] }) {
  const parts = useMemo(() => {
    const names = members
      .filter((m) => m.displayName.trim())
      .map((m) => m.displayName.trim())
      .sort((a, b) => b.length - a.length);
    if (names.length === 0) return [{ type: 'text' as const, value: text }];

    const pattern = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp(`(@(?:${pattern}))(?=\\s|$|[.,!?;:])`, 'gi');
    const segments: { type: 'text' | 'mention'; value: string }[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) {
        segments.push({ type: 'text', value: text.slice(last, match.index) });
      }
      segments.push({ type: 'mention', value: match[1] });
      last = match.index + match[1].length;
    }
    if (last < text.length) {
      segments.push({ type: 'text', value: text.slice(last) });
    }
    return segments.length ? segments : [{ type: 'text' as const, value: text }];
  }, [text, members]);

  return (
    <p className="mt-2 whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <span key={i} className="font-semibold text-accent-ink">
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}
