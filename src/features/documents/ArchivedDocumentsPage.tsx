import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useVaultStore } from '@/store/useVaultStore';
import { formatDate } from '@/lib/format';

export function ArchivedDocumentsPage() {
  const documents = useVaultStore((s) => s.documents);
  const unarchiveDocument = useVaultStore((s) => s.unarchiveDocument);
  const deleteDocument = useVaultStore((s) => s.deleteDocument);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const archived = useMemo(
    () =>
      documents
        .filter((d) => Boolean(d.archivedAt))
        .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
    [documents],
  );

  return (
    <div className="min-h-full pb-8">
      <Header title="Archived" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        {archived.length === 0 && <p className="text-sm text-muted">No archived documents.</p>}
        {archived.map((d) => (
          <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{d.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Archived {d.archivedAt ? formatDate(d.archivedAt) : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    unarchiveDocument(d.id);
                  }}
                >
                  Unarchive
                </Button>
                <Button
                  variant="danger"
                  className="px-3 py-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(d.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            {confirmDeleteId === d.id && (
              <div className="mt-3 rounded-2xl bg-danger/10 p-3 text-sm">
                <p className="text-danger">Delete permanently?</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(d.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </main>
    </div>
  );
}

