import type { AppSettings } from '@/types';

/** True when uploads should run OCR / field extraction (default on for older vaults). */
export function isDocumentProcessingEnabled(
  settings: Pick<AppSettings, 'documentProcessingEnabled'>,
): boolean {
  return settings.documentProcessingEnabled !== false;
}
