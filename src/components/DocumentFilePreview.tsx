import { isImageFile, isPdfFile } from '@/lib/files';

export function DocumentFilePreview({
  fileName,
  fileDataUrl,
}: {
  fileName?: string;
  fileDataUrl?: string;
}) {
  if (!fileDataUrl) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-accent-soft/30 p-6 text-center text-sm text-muted">
        <div>
          <p className="font-medium">No file attached</p>
          <p className="mt-1 text-xs">Upload a photo or PDF to view the original here.</p>
        </div>
      </div>
    );
  }

  const pdf = isPdfFile(fileName, fileDataUrl);
  const image = isImageFile(fileName, fileDataUrl);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label">Original document</p>
        {fileName && <p className="truncate text-xs text-muted">{fileName}</p>}
      </div>

      {image && (
        <img
          src={fileDataUrl}
          alt={fileName ?? 'Document'}
          className="max-h-[70vh] w-full rounded-2xl border border-border-soft bg-surface object-contain shadow-sm"
        />
      )}

      {pdf && (
        <iframe
          src={fileDataUrl}
          title={fileName ?? 'Document PDF'}
          className="h-[70vh] w-full rounded-2xl border border-border bg-bg"
        />
      )}

      {!image && !pdf && (
        <div className="rounded-2xl border border-border bg-bg p-4 text-sm">
          <p className="text-muted">Preview not available for this file type.</p>
          <a
            href={fileDataUrl}
            download={fileName ?? 'document'}
            className="mt-2 inline-block text-accent-ink"
          >
            Download file
          </a>
        </div>
      )}
    </section>
  );
}
