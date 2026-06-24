import type { ProgressStep } from './backupOperation';

export function BackupProgressPanel({
  title,
  steps,
  percent,
  error,
}: {
  title: string;
  steps: ProgressStep[];
  percent: number;
  error?: string;
}) {
  return (
    <div className="space-y-4" aria-live="polite">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
          <p className="font-medium text-text">{title}</p>
          <span className="text-xs tabular-nums text-muted">{percent}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-bg-subtle"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <StepIcon status={step.status} />
            <span
              className={
                step.status === 'active'
                  ? 'font-medium text-text'
                  : step.status === 'done'
                    ? 'text-muted line-through decoration-border'
                    : step.status === 'error'
                      ? 'font-medium text-danger'
                      : 'text-muted'
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepIcon({ status }: { status: ProgressStep['status'] }) {
  if (status === 'done') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-white">
        ✓
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent-ink" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger/15 text-xs font-bold text-danger">
        !
      </span>
    );
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border border-border bg-bg-subtle" />;
}
