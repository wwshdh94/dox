import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Document, FamilyMember } from '@/types';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberDocStats } from '@/components/MemberDocStats';

export function VaultSearchRow({
  search,
  onSearchChange,
  member,
  documents,
  docStats,
  onDueSoon,
  trailing,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  member?: FamilyMember;
  documents: Document[];
  docStats?: { total: number; expiring: number };
  onDueSoon?: (memberId?: string) => void;
  trailing?: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const expanded = focused;

  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rowRef.current?.contains(target)) return;
      inputRef.current?.blur();
      setFocused(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [focused]);

  return (
    <div
      ref={rowRef}
      className={`vault-search-row w-full ${expanded ? 'vault-search-row--expanded' : ''}`}
    >
      {member ? (
        <div className="vault-search-row__member">
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            className="flex min-w-0 items-center gap-3 rounded-2xl text-left"
          >
            <MemberAvatar member={member} size="sm" documents={documents} />
            <div className="flex min-w-0 flex-col justify-center gap-0.5 self-stretch py-0.5">
              <span className="truncate font-semibold leading-tight tracking-tight text-text">
                {member.displayName}
              </span>
              {docStats && onDueSoon ? (
                <span className="text-[0.6875rem] leading-tight text-muted">
                  <MemberDocStats
                    total={docStats.total}
                    expiring={docStats.expiring}
                    memberId={member.id}
                    onDueSoon={onDueSoon}
                  />
                </span>
              ) : null}
            </div>
          </button>
        </div>
      ) : (
        <div aria-hidden="true" />
      )}
      <div className="vault-search-row__search">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search passport, PAN, insurance…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          aria-label="Search documents"
          aria-expanded={expanded}
          className="vault-search-input"
        />
      </div>
      {expanded && trailing}
    </div>
  );
}

export const vaultSearchInputClassName = 'vault-search-input';
