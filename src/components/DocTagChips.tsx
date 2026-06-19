import { CATEGORY_LABELS, DOMAIN_LABELS, resolveDocTags } from '@/lib/docTags';
import type { Document } from '@/types';

export function DocTagChips({ doc }: { doc: Document }) {
  const { domain, category } = resolveDocTags(doc);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[0.68rem] font-semibold text-accent-ink">
        {DOMAIN_LABELS[domain]}
      </span>
      <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[0.68rem] font-medium text-muted">
        {CATEGORY_LABELS[category]}
      </span>
    </div>
  );
}
