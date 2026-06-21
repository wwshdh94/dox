import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { DocTypeIcon } from '@/components/DocTypeIcon';
import { ExpiryChip } from '@/components/ExpiryChip';
import { resolveDocTags } from '@/lib/docTags';
import { primaryRevealField, primaryRevealValue, normalizeDocFields } from '@/lib/docFields';
import { maskAadhaar, maskValue } from '@/lib/format';
import { useVaultStore } from '@/store/useVaultStore';
import type { Document } from '@/types';

function maskField(docType: Document['docType'], value: string): string {
  if (docType === 'aadhaar') return maskAadhaar(value);
  return maskValue(value);
}

function EyeToggleIcon({ revealed, compact = false }: { revealed: boolean; compact?: boolean }) {
  const size = compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';
  if (revealed) {
    return (
      <svg className={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }

  return (
    <svg className={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-4.02 5.18M6.12 6.12A18.5 18.5 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.08-1.24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocumentPill({
  document,
  onOpen,
  compact = false,
}: {
  document: Document;
  onOpen: () => void;
  /** ~30% smaller layout for home page lists. */
  compact?: boolean;
}) {
  const locked = useVaultStore((s) => s.locked);
  const biometricLockEnabled = useVaultStore((s) => s.settings.biometricLockEnabled);
  const logActivity = useVaultStore((s) => s.logActivity);
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);

  const fieldKey = primaryRevealField(document.docType);
  const value = primaryRevealValue(
    document.docType,
    normalizeDocFields(document.docType, document.fields),
  );

  const toggleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (biometricLockEnabled && locked) {
      navigate('/lock');
      return;
    }
    setRevealed((v) => !v);
  };

  const copyRevealed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || !revealed || (biometricLockEnabled && locked)) return;
    void navigator.clipboard.writeText(value);
    if (fieldKey) logActivity('copied_field', { field: fieldKey }, document.id);
  };

  const tags = resolveDocTags(document);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex">
        <DocTypeIcon
          docType={document.docType}
          category={tags.category}
          title={document.title}
          fill
          compact={compact}
          className="rounded-l-[var(--radius-lg)]"
        />
        <div
          className={`flex min-w-0 flex-1 flex-col justify-center ${compact ? 'gap-0.5 px-1.5 py-1' : 'gap-1 px-2 py-1.5'}`}
        >
          <div
            role="button"
            tabIndex={0}
            className="cursor-pointer text-left outline-none"
            onClick={onOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }}
          >
            <div className={`flex items-center justify-between ${compact ? 'gap-1' : 'gap-1.5'}`}>
              <p
                className={`min-w-0 truncate font-medium leading-tight ${compact ? 'text-xs' : 'text-sm'}`}
              >
                {document.title}
              </p>
              {document.expiryDate ? (
                <span className="shrink-0">
                  <ExpiryChip date={document.expiryDate} compact tiny={compact} />
                </span>
              ) : null}
            </div>
          </div>
          {value ? (
            <div
              className={`flex items-center rounded-lg bg-accent-soft/40 ${compact ? 'gap-1 px-1.5 py-0.5' : 'gap-1.5 px-2 py-1'}`}
            >
              <button
                type="button"
                className={`min-w-0 flex-1 truncate text-left font-mono text-text ${compact ? 'text-[0.65rem]' : 'text-xs'}`}
                onClick={revealed ? copyRevealed : toggleReveal}
                title={revealed ? 'Tap to copy' : undefined}
              >
                {revealed ? value : maskField(document.docType, value)}
              </button>
              <button
                type="button"
                onClick={toggleReveal}
                aria-label={revealed ? 'Hide value' : 'Show value'}
                aria-pressed={revealed}
                className={`shrink-0 rounded-md text-accent-ink transition-colors hover:bg-accent-soft ${compact ? 'p-0.5' : 'p-1'}`}
              >
                <EyeToggleIcon revealed={revealed} compact={compact} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
