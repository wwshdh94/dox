import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isImageFile, isPdfFile } from '@/lib/files';

function DocumentPreviewContent({
  fileName,
  fileDataUrl,
  pdf,
  image,
  className,
}: {
  fileName?: string;
  fileDataUrl: string;
  pdf: boolean;
  image: boolean;
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={fileDataUrl}
        alt={fileName ?? 'Document'}
        className={className ?? 'h-full w-full object-contain'}
      />
    );
  }

  if (pdf) {
    return (
      <iframe
        src={fileDataUrl}
        title={fileName ?? 'Document PDF'}
        className={className ?? 'h-full w-full border-0 bg-bg'}
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-sm">
      <p className="text-muted">Preview not available for this file type.</p>
      <a
        href={fileDataUrl}
        download={fileName ?? 'document'}
        className="mt-2 inline-block text-accent-ink"
      >
        Download file
      </a>
    </div>
  );
}

function FullscreenViewer({
  fileName,
  fileDataUrl,
  pdf,
  image,
  onClose,
}: {
  fileName?: string;
  fileDataUrl: string;
  pdf: boolean;
  image: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-text/95">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm font-medium text-accent-fg">
          {fileName ?? 'Document'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-fg/10 text-lg text-accent-fg transition-colors hover:bg-accent-fg/20"
          aria-label="Close full screen"
        >
          ✕
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {image ? (
          <img
            src={fileDataUrl}
            alt={fileName ?? 'Document'}
            className="mx-auto max-h-[calc(100dvh-5rem)] w-auto max-w-full object-contain"
          />
        ) : pdf ? (
          <iframe
            src={fileDataUrl}
            title={fileName ?? 'Document PDF'}
            className="h-[calc(100dvh-5rem)] w-full max-w-4xl flex-1 self-center rounded-lg border-0 bg-bg"
          />
        ) : (
          <DocumentPreviewContent
            fileName={fileName}
            fileDataUrl={fileDataUrl}
            pdf={pdf}
            image={image}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

export function DocumentFilePreview({
  fileName,
  fileDataUrl,
  additionalFileDataUrls,
  loading,
  error,
}: {
  fileName?: string;
  fileDataUrl?: string;
  additionalFileDataUrls?: string[];
  loading?: boolean;
  error?: string | null;
}) {
  const pages = [fileDataUrl, ...(additionalFileDataUrls ?? [])].filter((u): u is string =>
    Boolean(u),
  );
  const [activePage, setActivePage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActivePage(0);
  }, [fileDataUrl, additionalFileDataUrls?.length]);

  const multiPage = pages.length > 1;

  const handleSwipeEnd = (clientX: number, clientY: number) => {
    if (!multiPage || !swipeStart.current) return;
    const dx = clientX - swipeStart.current.x;
    const dy = clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && activePage < pages.length - 1) setActivePage((p) => p + 1);
    if (dx > 0 && activePage > 0) setActivePage((p) => p - 1);
  };

  const swipeHandlers = multiPage
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          const t = e.changedTouches[0];
          if (t) swipeStart.current = { x: t.clientX, y: t.clientY };
        },
        onTouchEnd: (e: React.TouchEvent) => {
          const t = e.changedTouches[0];
          if (t) handleSwipeEnd(t.clientX, t.clientY);
        },
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === 'touch') return;
          swipeStart.current = { x: e.clientX, y: e.clientY };
        },
        onPointerUp: (e: React.PointerEvent) => {
          if (e.pointerType === 'touch') return;
          handleSwipeEnd(e.clientX, e.clientY);
        },
      }
    : {};

  if (loading) {
    return (
      <div className="flex h-[25vh] items-center justify-center rounded-2xl border border-dashed border-border bg-accent-soft/30 p-6 text-center text-sm text-muted">
        Loading encrypted file…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[25vh] items-center justify-center rounded-2xl border border-dashed border-danger/30 bg-danger/5 p-6 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex h-[25vh] items-center justify-center rounded-2xl border border-dashed border-border bg-accent-soft/30 p-6 text-center text-sm text-muted">
        <div>
          <p className="font-medium">No file attached</p>
          <p className="mt-1 text-xs">Upload a photo or PDF to view the original here.</p>
        </div>
      </div>
    );
  }

  const currentUrl = pages[activePage] ?? pages[0]!;
  const pdf = isPdfFile(fileName, currentUrl);
  const image = isImageFile(fileName, currentUrl);
  const canExpand = image || pdf;
  const pageLabel = pages.length > 1 ? `Page ${activePage + 1} of ${pages.length}` : null;

  return (
    <>
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Preview</p>
          <div className="flex min-w-0 items-center gap-2">
            {pageLabel && <p className="truncate text-xs text-muted">{pageLabel}</p>}
            {canExpand && (
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="shrink-0 text-xs font-semibold text-accent-ink"
              >
                View full screen
              </button>
            )}
          </div>
        </div>

        {pages.length > 1 && (
          <div className="space-y-1">
            <p className="text-center text-[0.65rem] text-muted">Swipe left or right on the preview</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
            {pages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePage(idx)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  idx === activePage
                    ? 'bg-accent text-accent-fg'
                    : 'bg-surface-elevated text-muted'
                }`}
              >
                Page {idx + 1}
              </button>
            ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => canExpand && setFullscreen(true)}
          disabled={!canExpand}
          className={`block h-[25vh] w-full overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm ${
            canExpand ? 'cursor-zoom-in' : 'cursor-default'
          }`}
          aria-label={
            canExpand
              ? `Open document in full screen${pageLabel ? `, ${pageLabel}` : ''}`
              : undefined
          }
          {...swipeHandlers}
        >
          <DocumentPreviewContent
            fileName={fileName}
            fileDataUrl={currentUrl}
            pdf={pdf}
            image={image}
          />
        </button>
      </section>

      {fullscreen && (
        <FullscreenViewer
          fileName={pageLabel ?? 'Document preview'}
          fileDataUrl={currentUrl}
          pdf={pdf}
          image={image}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}
