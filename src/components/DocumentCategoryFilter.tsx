import {
  FAMILY_DOC_FILTERS,
  type FamilyDocFilterId,
} from '@/lib/docCategoryFilter';

export function DocumentCategoryFilter({
  value,
  onChange,
  availableFilters,
}: {
  value: FamilyDocFilterId;
  onChange: (id: FamilyDocFilterId) => void;
  availableFilters: FamilyDocFilterId[];
}) {
  const pills = FAMILY_DOC_FILTERS.filter((f) => availableFilters.includes(f.id));
  if (pills.length <= 1) return null;

  return (
    <div
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
      role="tablist"
      aria-label="Filter documents by category"
    >
      {pills.map((f) => {
        const selected = value === f.id;
        const isDueSoon = f.id === 'due_soon';
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-[0.7rem] font-semibold transition-colors ${
              selected
                ? isDueSoon
                  ? 'border-warning/50 bg-warning/15 text-warning'
                  : 'border-accent-muted bg-accent-soft text-accent-ink'
                : isDueSoon
                  ? 'border-warning/30 bg-surface-elevated text-warning hover:border-warning/50'
                  : 'border-border bg-surface-elevated text-muted hover:border-accent-muted hover:text-text'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
