import type { ReactNode } from 'react';
import { formatShareDate } from '@/lib/bundleShare';

/** Repeating diagonal watermark — hard to crop without leaving marks on content */
export function ShareWatermark({
  purpose,
  sharedAt,
  sharedWith,
}: {
  purpose: string;
  sharedAt: string;
  sharedWith?: string;
}) {
  const line = `PreVault · ${purpose} · ${formatShareDate(sharedAt)}${sharedWith ? ` · ${sharedWith}` : ''}`;

  return (
    <>
      <div className="share-watermark-grid pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="share-watermark-line absolute whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-wider text-text/10"
            style={{
              top: `${(i % 4) * 28 + 8}%`,
              left: `${Math.floor(i / 4) * 35 - 10}%`,
              transform: 'rotate(-24deg)',
            }}
          >
            {line}
          </span>
        ))}
      </div>
      <header className="share-watermark-banner relative z-10 mb-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-center text-xs text-text">
        <p className="font-semibold">{purpose}</p>
        <p className="mt-0.5 text-muted">
          Shared {formatShareDate(sharedAt)}
          {sharedWith ? ` · For ${sharedWith}` : ''}
        </p>
      </header>
    </>
  );
}

export function SecureShareFrame({
  purpose,
  sharedAt,
  sharedWith,
  watermark,
  children,
}: {
  purpose: string;
  sharedAt: string;
  sharedWith?: string;
  watermark: boolean;
  children: ReactNode;
}) {
  return (
    <div className="secure-share-frame relative select-none">
      {watermark && <ShareWatermark purpose={purpose} sharedAt={sharedAt} sharedWith={sharedWith} />}
      <div className="relative z-[1]">{children}</div>
      <footer className="share-watermark-footer relative z-10 mt-6 border-t border-border-soft pt-3 text-center text-[0.65rem] text-muted">
        View-only · Not for redistribution · Watermarked copy
      </footer>
    </div>
  );
}
