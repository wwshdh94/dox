import { formatMemberDocStats } from '@/lib/memberStats';

export function MemberDocStats({
  total,
  expiring,
  memberId,
  onDueSoon,
}: {
  total: number;
  expiring: number;
  memberId?: string;
  onDueSoon: (memberId?: string) => void;
}) {
  if (expiring === 0) {
    return <span>{formatMemberDocStats(total, expiring)}</span>;
  }

  const docLabel = `${total} document${total === 1 ? '' : 's'}`;

  return (
    <span>
      {docLabel} ·{' '}
      <button
        type="button"
        className="font-medium text-warning underline decoration-warning/40 underline-offset-2"
        onClick={(e) => {
          e.stopPropagation();
          onDueSoon(memberId);
        }}
      >
        {expiring} due soon
      </button>
    </span>
  );
}
