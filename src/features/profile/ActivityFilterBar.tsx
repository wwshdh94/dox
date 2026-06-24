import { useMemo, useState } from 'react';
import type { FamilyMember } from '@/types';
import {
  ACTIVITY_TIME_RANGE_LABELS,
  ACTIVITY_SORT_LABELS,
  DEFAULT_ACTIVITY_FILTERS,
  SHARE_LINK_SORT_LABELS,
  countActiveActivityFilters,
  type ActivityListFilters,
  type ActivitySortKey,
  type ActivityTimeRange,
  type ShareLinkSortKey,
} from '@/lib/activityFilters';

const TIME_RANGES: ActivityTimeRange[] = ['all', 'today', '7d', '30d'];

type ActivityFilterBarProps = {
  filters: ActivityListFilters;
  onChange: (filters: ActivityListFilters) => void;
  memberOptions: FamilyMember[];
  documentOptions: { id: string; title: string }[];
  sortKey: ActivitySortKey | ShareLinkSortKey;
  onSortChange: (sort: ActivitySortKey | ShareLinkSortKey) => void;
  sortMode: 'activity' | 'share';
};

const compactSelectClass =
  'min-h-9 w-full min-w-0 rounded-xl border border-border bg-surface px-2.5 text-xs text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft';

export function ActivityFilterBar({
  filters,
  onChange,
  memberOptions,
  documentOptions,
  sortKey,
  onSortChange,
  sortMode,
}: ActivityFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveActivityFilters(filters);

  const sortLabels = sortMode === 'share' ? SHARE_LINK_SORT_LABELS : ACTIVITY_SORT_LABELS;

  const chips = useMemo(() => {
    const items: { key: keyof ActivityListFilters; label: string; clear: ActivityListFilters }[] = [];
    if (filters.memberId) {
      const member = memberOptions.find((m) => m.id === filters.memberId);
      items.push({
        key: 'memberId',
        label: member?.displayName ?? 'Member',
        clear: { ...filters, memberId: '' },
      });
    }
    if (filters.documentId) {
      const doc = documentOptions.find((d) => d.id === filters.documentId);
      items.push({
        key: 'documentId',
        label: doc?.title ?? 'Document',
        clear: { ...filters, documentId: '' },
      });
    }
    if (filters.timeRange !== 'all') {
      items.push({
        key: 'timeRange',
        label: ACTIVITY_TIME_RANGE_LABELS[filters.timeRange],
        clear: { ...filters, timeRange: 'all' },
      });
    }
    return items;
  }, [filters, memberOptions, documentOptions]);

  const update = <K extends keyof ActivityListFilters>(key: K, value: ActivityListFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
            expanded || activeCount > 0
              ? 'border-accent bg-accent-soft text-accent-ink'
              : 'border-border bg-surface-elevated text-muted'
          }`}
        >
          <FilterIcon />
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.625rem] font-bold leading-none text-accent-fg">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && !expanded && (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => onChange(chip.clear)}
              />
            ))}
          </div>
        )}

        <label className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="sr-only">Sort</span>
          <select
            className={`${compactSelectClass} w-auto max-w-[9.5rem]`}
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as ActivitySortKey | ShareLinkSortKey)}
            aria-label="Sort list"
          >
            {(Object.entries(sortLabels) as [ActivitySortKey | ShareLinkSortKey, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {expanded && (
        <div className="space-y-2.5 rounded-2xl border border-border bg-surface-elevated p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">When</p>
            {activeCount > 0 && (
              <button
                type="button"
                className="text-[0.6875rem] font-semibold text-accent-ink"
                onClick={() => onChange(DEFAULT_ACTIVITY_FILTERS)}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => update('timeRange', range)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filters.timeRange === range
                    ? 'bg-accent text-accent-fg'
                    : 'border border-border bg-surface text-muted'
                }`}
              >
                {ACTIVITY_TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block min-w-0 space-y-1">
              <span className="text-[0.6875rem] font-semibold text-muted">Member</span>
              <select
                className={compactSelectClass}
                value={filters.memberId}
                onChange={(e) => update('memberId', e.target.value)}
              >
                <option value="">All</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 space-y-1">
              <span className="text-[0.6875rem] font-semibold text-muted">Document</span>
              <select
                className={compactSelectClass}
                value={filters.documentId}
                onChange={(e) => update('documentId', e.target.value)}
                disabled={documentOptions.length === 0}
              >
                <option value="">All</option>
                {documentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[0.6875rem] font-medium text-text">
      <span className="max-w-[6rem] truncate">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted hover:text-text"
      >
        ×
      </button>
    </span>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M2 4h12M4.5 8h7M7 12h2" strokeLinecap="round" />
    </svg>
  );
}
