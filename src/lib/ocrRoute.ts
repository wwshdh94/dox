import type { DocType } from '@/types';
import type { ExtractMode } from '@/lib/ocr';

const CLOUD_PREFERRED = new Set<DocType>([
  'driving_license',
  'voter_id',
  'passport',
  'vehicle_rc',
  'vehicle_puc',
  'vehicle_insurance',
  'insurance',
  'health_insurance',
  'lab_report',
  'prescription',
  'discharge_summary',
  'medical_bill',
  'vaccination',
  'purchase_receipt',
  'warranty',
]);

const ON_DEVICE_FIRST = new Set<DocType>(['pan', 'aadhaar']);

export function isImageDataUrl(url?: string): boolean {
  return Boolean(url?.startsWith('data:image/'));
}

export function shouldExtractFromUpload(opts: {
  fileDataUrl?: string;
  additionalFileDataUrls?: string[];
}): boolean {
  const pages = [opts.fileDataUrl, ...(opts.additionalFileDataUrls ?? [])].filter(Boolean);
  return pages.some((url) => isImageDataUrl(url));
}

/** Pick initial OCR path without asking the user. */
export function chooseInitialExtractMode(opts: {
  docType: DocType;
  cloudAllowed: boolean;
  hasImage: boolean;
}): ExtractMode {
  if (!opts.hasImage) return 'on_device';

  if (ON_DEVICE_FIRST.has(opts.docType)) {
    return 'on_device';
  }

  if (opts.cloudAllowed && CLOUD_PREFERRED.has(opts.docType)) {
    return 'cloud';
  }

  return 'on_device';
}

export function shouldEscalateToCloud(opts: {
  docType: DocType;
  confidence: number;
  filledFields: number;
  cloudAllowed: boolean;
  alreadyCloud: boolean;
}): boolean {
  if (!opts.cloudAllowed || opts.alreadyCloud) return false;

  if (ON_DEVICE_FIRST.has(opts.docType)) {
    if (opts.confidence >= 0.68 && opts.filledFields >= 2) return false;
    if (opts.confidence < 0.5 || opts.filledFields < 1) return true;
    return opts.confidence < 0.62;
  }

  if (CLOUD_PREFERRED.has(opts.docType)) {
    return opts.confidence < 0.72 || opts.filledFields < 1;
  }

  return opts.confidence < 0.42 && opts.filledFields < 1;
}
