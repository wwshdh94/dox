import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  transparent = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** No panel fill — content floats over a dimmed full-screen scrim. */
  transparent?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const overlayClass = transparent
    ? 'bg-text/45 backdrop-blur-sm'
    : 'bg-text/30 backdrop-blur-md';
  const panelClass = transparent
    ? 'animate-fade-up relative z-10 max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto px-6 py-4'
    : 'surface-panel-elevated animate-fade-up relative z-10 max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto bg-surface-elevated p-6 shadow-lg';

  const content = (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${overlayClass}`}
      role="presentation"
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className={panelClass} role="dialog" aria-modal="true" aria-label={title ?? 'Dialog'}>
        {!transparent && (
          <div className={`flex items-center ${title ? 'mb-5 justify-between' : 'mb-3 justify-end'}`}>
            {title ? (
              <h2 className="min-w-0 flex-1 truncate pr-2 text-lg font-semibold leading-tight tracking-tight text-text">
                {title}
              </h2>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-text"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
