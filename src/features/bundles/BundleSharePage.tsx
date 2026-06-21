import { useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SecureShareFrame } from '@/components/ShareWatermark';
import { Button } from '@/components/Button';
import { useVaultStore } from '@/store/useVaultStore';
import { redactFields } from '@/lib/bundleShare';

export function BundleSharePage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';

  const bundles = useVaultStore((s) => s.bundles);
  const documents = useVaultStore((s) => s.documents);
  const bundleShareLinks = useVaultStore((s) => s.bundleShareLinks);
  const user = useVaultStore((s) => s.user);
  const recordBundleLinkAccess = useVaultStore((s) => s.recordBundleLinkAccess);
  const recordBundlePrint = useVaultStore((s) => s.recordBundlePrint);
  const accessedRef = useRef(false);

  const link = useMemo(
    () => bundleShareLinks.find((l) => l.token === token && l.status === 'active'),
    [bundleShareLinks, token],
  );
  const expired = link && new Date(link.expiresAt) < new Date();
  const bundle = link ? bundles.find((b) => b.id === link.bundleId) : undefined;
  const bundleDocs = useMemo(
    () => (bundle ? documents.filter((d) => !d.archivedAt && bundle.documentIds.includes(d.id)) : []),
    [bundle, documents],
  );

  useEffect(() => {
    if (!token || !link || expired || accessedRef.current) return;
    accessedRef.current = true;
    recordBundleLinkAccess(token);
  }, [token, link, expired, recordBundleLinkAccess]);

  useEffect(() => {
    if (printMode && token && link && !expired) {
      recordBundlePrint(token);
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
  }, [printMode, token, link, expired, recordBundlePrint]);

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  if (!link || expired || !bundle) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-center text-muted">
        <div>
          <p className="text-lg font-medium">Link expired or revoked</p>
          <p className="mt-2 text-sm">Ask the owner for a new share link.</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    recordBundlePrint(token!);
    window.print();
  };

  return (
    <div className="bundle-share-page mx-auto max-w-md p-4 pb-12 print:p-0">
      {!printMode && (
        <div className="no-print mb-4 space-y-2">
          <p className="text-xs text-warning">
            Shared via Dox · Expires {new Date(link.expiresAt).toLocaleString()} · View & print only
          </p>
          <Button className="w-full" onClick={handlePrint}>
            Print bundle
          </Button>
          <p className="text-center text-[0.65rem] text-muted">
            Printing is recommended — saving files locally is disabled on this page.
          </p>
        </div>
      )}

      <SecureShareFrame
        purpose={link.purpose}
        sharedAt={link.createdAt}
        sharedWith={link.sharedWith}
        watermark={link.watermark}
      >
        <div className="space-y-4">
          <div className="text-center print:mb-6">
            <p className="font-display text-xl text-text">Document bundle</p>
            <p className="text-sm text-muted">From {user?.name ?? 'Dox user'}</p>
          </div>

          {bundleDocs.map((doc) => {
            const fields = redactFields(doc.fields);
            return (
              <article
                key={doc.id}
                className="share-doc-block break-inside-avoid rounded-2xl border border-border-soft bg-surface p-4"
              >
                <h2 className="font-semibold">{doc.title}</h2>
                <p className="text-xs text-muted">{doc.docType.replace(/_/g, ' ')}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  {Object.entries(fields).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="text-muted">{k}:</dt>
                      <dd className="font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
                {doc.fileDataUrl && (
                  <div className="share-preview-only relative mt-3 overflow-hidden rounded-xl border border-border-soft">
                    {doc.fileDataUrl.startsWith('data:image') ? (
                      <img
                        src={doc.fileDataUrl}
                        alt=""
                        className="max-h-64 w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <p className="p-4 text-xs text-muted">Document preview — print this page for a copy.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </SecureShareFrame>
    </div>
  );
}
