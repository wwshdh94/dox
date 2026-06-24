import type { Document, FamilyMember } from '@/types';
import type { ReactNode } from 'react';
import { docTypeLabel } from '@/lib/docFields';
import { expiryStatus, formatDate } from '@/lib/format';
import { memberSelectLabel } from '@/lib/family';

const expiryTone: Record<ReturnType<typeof expiryStatus>, string> = {
  none: 'bg-surface-elevated text-muted',
  ok: 'bg-success/10 text-success',
  expiring: 'bg-warning/10 text-warning',
  expired: 'bg-danger/10 text-danger',
};

export function DocumentSummaryHeader({
  doc,
  members,
  meta,
}: {
  doc: Pick<Document, 'title' | 'docType' | 'memberId' | 'expiryDate'>;
  members: FamilyMember[];
  meta?: ReactNode;
}) {
  const member = members.find((m) => m.id === doc.memberId);
  const status = expiryStatus(doc.expiryDate);

  return (
    <div className="surface-panel space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-text">{doc.title}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {docTypeLabel(doc.docType)}
            {member ? ` · ${memberSelectLabel(member)}` : ''}
          </p>
        </div>
        {doc.expiryDate ? (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${expiryTone[status]}`}>
            {status === 'expired' ? 'Expired' : status === 'expiring' ? 'Expiring soon' : formatDate(doc.expiryDate)}
          </span>
        ) : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </div>
  );
}
