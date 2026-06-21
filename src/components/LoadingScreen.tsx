import { useMemo } from 'react';
import { nextLoadingTip } from '@/lib/loadingTips';

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-1.5 ${className}`} role="status" aria-label="Loading">
      <span className="loading-dot h-2.5 w-2.5 rounded-full bg-accent-ink" />
      <span className="loading-dot h-2.5 w-2.5 rounded-full bg-accent-ink [animation-delay:0.2s]" />
      <span className="loading-dot h-2.5 w-2.5 rounded-full bg-accent-ink [animation-delay:0.4s]" />
    </div>
  );
}

/** Centered loading state with a rotating product tip. */
export function LoadingScreen({
  label = 'Loading…',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  const tip = useMemo(() => nextLoadingTip(), []);

  return (
    <div className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${className}`}>
      <LoadingSpinner />
      <p className="text-sm font-medium text-text">{label}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted">{tip}</p>
    </div>
  );
}

/** Full-screen overlay for async work (backup, OCR, network). */
export function LoadingOverlay({
  open,
  label = 'Please wait…',
}: {
  open: boolean;
  label?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-text/25 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={label}
    >
      <div className="surface-panel-elevated mx-4 w-full max-w-sm p-8">
        <LoadingScreen label={label} />
      </div>
    </div>
  );
}
