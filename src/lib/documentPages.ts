import type { Document } from '@/types';

/** All file pages for a document (primary + additional scans). */
export function getDocumentFilePages(
  doc: Pick<Document, 'fileDataUrl' | 'additionalFileDataUrls'>,
): string[] {
  return [doc.fileDataUrl, ...(doc.additionalFileDataUrls ?? [])].filter((u): u is string =>
    Boolean(u),
  );
}

export function splitDocumentFilePages(pages: string[]): {
  fileDataUrl?: string;
  additionalFileDataUrls?: string[];
} {
  if (pages.length === 0) return {};
  const [first, ...rest] = pages;
  return {
    fileDataUrl: first,
    additionalFileDataUrls: rest.length > 0 ? rest : undefined,
  };
}
