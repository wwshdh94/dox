import { useState } from 'react';
import type { DocType } from '@/types';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { fieldLabelFor, primaryFieldKeys, secondaryFieldKeys } from '@/lib/docFields';
import { formatDate, maskAadhaar } from '@/lib/format';
import { triggerHaptic } from '@/lib/haptics';

function displayFieldValue(docType: DocType, key: string, value: string): string {
  if (docType === 'aadhaar' && key === 'aadhaarNumber') return maskAadhaar(value);
  const def = key.toLowerCase();
  if (def.includes('date') || def.includes('until') || def.includes('due')) {
    try {
      return formatDate(value);
    } catch {
      return value;
    }
  }
  return value;
}

function FieldRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex w-full items-start justify-between gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-accent-soft/30 active:scale-[0.99]"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-muted">{label}</span>
        <span className="mt-0.5 block break-all text-sm font-medium text-text">{value}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-accent-ink">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function DocumentFieldsList({
  docType,
  fields,
  hapticsEnabled = true,
}: {
  docType: DocType;
  fields: Record<string, string>;
  hapticsEnabled?: boolean;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = async (key: string, raw: string) => {
    try {
      await navigator.clipboard.writeText(raw);
      triggerHaptic('success', { enabled: hapticsEnabled });
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      triggerHaptic('error', { enabled: hapticsEnabled });
    }
  };

  const renderFields = (keys: string[]) =>
    keys
      .map((key) => {
        const raw = fields[key];
        if (!raw) return null;
        return (
          <FieldRow
            key={key}
            label={fieldLabelFor(docType, key)}
            value={displayFieldValue(docType, key, raw)}
            copied={copiedKey === key}
            onCopy={() => void copyValue(key, raw)}
          />
        );
      })
      .filter(Boolean);

  const primary = renderFields(primaryFieldKeys(docType));
  const secondaryKeys = secondaryFieldKeys(docType).filter((key) => Boolean(fields[key]));
  const secondary = renderFields(secondaryKeys);

  if (primary.length === 0 && secondary.length === 0) {
    return (
      <div className="surface-panel p-4 text-sm text-muted">
        No field details yet. Tap Edit to add information.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {primary.length > 0 ? (
        <section className="surface-panel divide-y divide-border-soft p-2">{primary}</section>
      ) : null}
      {secondary.length > 0 ? (
        <CollapsibleSection title="More fields" badge={`${secondary.length}`} defaultOpen={false}>
          <div className="divide-y divide-border-soft">{secondary}</div>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
