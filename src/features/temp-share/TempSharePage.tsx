import { useParams } from 'react-router-dom';
import { useVaultStore } from '@/store/useVaultStore';
import { fieldLabelFor } from '@/lib/docFields';

export function TempSharePage() {
  const { token } = useParams<{ token: string }>();
  const tempLinks = useVaultStore((s) => s.tempLinks);
  const documents = useVaultStore((s) => s.documents);

  const link = tempLinks.find((l) => l.token === token && l.status === 'active');
  const expired = link && new Date(link.expiresAt) < new Date();
  const doc = link ? documents.find((d) => d.id === link.documentId) : undefined;

  if (!link || expired || !doc) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-center text-muted">
        <div>
          <p className="text-lg font-medium">Link expired or revoked</p>
          <p className="mt-2 text-sm">Ask the owner for a new share link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <p className="text-xs text-warning">Shared via Dox — expires soon · ID fields redacted</p>
      <div className="surface-panel p-4">
        <p className="font-medium">{doc.title}</p>
        {Object.entries(doc.fields).map(([k, v]) => (
          v !== '' && v != null && (
            <p key={k} className="mt-2 text-sm">
              <span className="text-muted">{fieldLabelFor(doc.docType, k)}: </span>
              {k.toLowerCase().includes('aadhaar') ? 'XXXX-XXXX-' + String(v).slice(-4) : String(v)}
            </p>
          )
        ))}
      </div>
      <p className="text-center text-xs text-muted">Watermark: view-only · not for redistribution</p>
    </div>
  );
}
