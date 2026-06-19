/** Small initials badges for document owner(s) */
export function MemberInitialsBadges({ initials }: { initials: string[] }) {
  if (initials.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-1">
      {initials.map((init) => (
        <span
          key={init}
          className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-accent-soft px-1.5 text-[0.65rem] font-bold text-accent-ink"
          title={init}
        >
          {init}
        </span>
      ))}
    </div>
  );
}
