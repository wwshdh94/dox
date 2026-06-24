import type { DocType } from '@/types';

/** Normalized crop rectangle (0–1 relative to image dimensions). */
export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type OcrRegionMode = 'line' | 'block';

export interface OcrRegionDef {
  id: string;
  rect: NormalizedRect;
  /** Tesseract page-seg hint — line mode for numbers, block for names. */
  mode: OcrRegionMode;
}

const ID_DOC_TYPES = new Set<DocType>([
  'pan',
  'aadhaar',
  'passport',
  'driving_license',
  'voter_id',
]);

/** Indian PAN card — landscape PVC; fields in lower half. */
const PAN_REGIONS: OcrRegionDef[] = [
  { id: 'name', rect: { x: 0.04, y: 0.38, w: 0.92, h: 0.14 }, mode: 'block' },
  { id: 'father_name', rect: { x: 0.04, y: 0.5, w: 0.92, h: 0.12 }, mode: 'block' },
  { id: 'dob', rect: { x: 0.04, y: 0.6, w: 0.45, h: 0.1 }, mode: 'line' },
  { id: 'pan_number', rect: { x: 0.08, y: 0.72, w: 0.84, h: 0.16 }, mode: 'line' },
];

/** Aadhaar front — portrait; demographics right of photo. */
const AADHAAR_FRONT_REGIONS: OcrRegionDef[] = [
  { id: 'name', rect: { x: 0.32, y: 0.22, w: 0.63, h: 0.14 }, mode: 'block' },
  { id: 'dob', rect: { x: 0.32, y: 0.36, w: 0.55, h: 0.1 }, mode: 'line' },
  { id: 'gender', rect: { x: 0.32, y: 0.46, w: 0.35, h: 0.08 }, mode: 'line' },
  { id: 'aadhaar_number', rect: { x: 0.06, y: 0.74, w: 0.88, h: 0.14 }, mode: 'line' },
];

/** Aadhaar back — address block + optional S/O line. */
const AADHAAR_BACK_REGIONS: OcrRegionDef[] = [
  { id: 'address', rect: { x: 0.06, y: 0.18, w: 0.88, h: 0.45 }, mode: 'block' },
  { id: 'father_name', rect: { x: 0.06, y: 0.62, w: 0.88, h: 0.12 }, mode: 'block' },
  { id: 'aadhaar_number', rect: { x: 0.06, y: 0.78, w: 0.88, h: 0.12 }, mode: 'line' },
];

/** Passport biodata — MRZ band at bottom. */
const PASSPORT_MRZ_REGION: OcrRegionDef[] = [
  { id: 'mrz', rect: { x: 0, y: 0.76, w: 1, h: 0.24 }, mode: 'line' },
  { id: 'name', rect: { x: 0.05, y: 0.2, w: 0.9, h: 0.12 }, mode: 'block' },
  { id: 'passport_number', rect: { x: 0.55, y: 0.34, w: 0.4, h: 0.08 }, mode: 'line' },
];

/** Indian driving licence — standard credit-card layout. */
const DL_REGIONS: OcrRegionDef[] = [
  { id: 'name', rect: { x: 0.04, y: 0.28, w: 0.92, h: 0.14 }, mode: 'block' },
  { id: 'license_number', rect: { x: 0.04, y: 0.44, w: 0.92, h: 0.12 }, mode: 'line' },
  { id: 'dob', rect: { x: 0.04, y: 0.56, w: 0.45, h: 0.1 }, mode: 'line' },
  { id: 'validity', rect: { x: 0.48, y: 0.56, w: 0.48, h: 0.1 }, mode: 'line' },
];

const VOTER_ID_REGIONS: OcrRegionDef[] = [
  { id: 'name', rect: { x: 0.04, y: 0.3, w: 0.92, h: 0.14 }, mode: 'block' },
  { id: 'voter_id', rect: { x: 0.04, y: 0.46, w: 0.92, h: 0.12 }, mode: 'line' },
  { id: 'dob', rect: { x: 0.04, y: 0.58, w: 0.45, h: 0.1 }, mode: 'line' },
];

export function usesRegionOcr(docType: DocType): boolean {
  return ID_DOC_TYPES.has(docType);
}

/** ROI layout for a document type and page index (multi-page Aadhaar). */
export function getOcrRegions(docType: DocType, pageIndex = 0): OcrRegionDef[] {
  switch (docType) {
    case 'pan':
      return PAN_REGIONS;
    case 'aadhaar':
      return pageIndex === 0 ? AADHAAR_FRONT_REGIONS : AADHAAR_BACK_REGIONS;
    case 'passport':
      return PASSPORT_MRZ_REGION;
    case 'driving_license':
      return DL_REGIONS;
    case 'voter_id':
      return VOTER_ID_REGIONS;
    default:
      return [];
  }
}

export function cropImageRegion(
  source: CanvasImageSource,
  width: number,
  height: number,
  rect: NormalizedRect,
): string {
  const sx = Math.max(0, Math.min(width - 1, Math.round(rect.x * width)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(rect.y * height)));
  const sw = Math.max(1, Math.min(width - sx, Math.round(rect.w * width)));
  const sh = Math.max(1, Math.min(height - sy, Math.round(rect.h * height)));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/png');
}

/** Build labeled text block for legacy parsers + debugging. */
export function formatRegionOcrText(regions: Record<string, string>): string {
  return Object.entries(regions)
    .filter(([, text]) => text.trim().length > 0)
    .map(([id, text]) => `[${id}]\n${text.trim()}`)
    .join('\n\n');
}

/** Rotate normalized rect 90° clockwise (portrait photo of landscape card). */
export function rotateRect90CW(rect: NormalizedRect): NormalizedRect {
  return clampRect({
    x: 1 - rect.y - rect.h,
    y: rect.x,
    w: rect.h,
    h: rect.w,
  });
}

/** Rotate normalized rect 90° counter-clockwise. */
export function rotateRect90CCW(rect: NormalizedRect): NormalizedRect {
  return clampRect({
    x: rect.y,
    y: 1 - rect.x - rect.w,
    w: rect.h,
    h: rect.w,
  });
}

function clampRect(rect: NormalizedRect): NormalizedRect {
  const x = Math.max(0, Math.min(1, rect.x));
  const y = Math.max(0, Math.min(1, rect.y));
  const w = Math.max(0.05, Math.min(1 - x, rect.w));
  const h = Math.max(0.05, Math.min(1 - y, rect.h));
  return { x, y, w, h };
}

/**
 * Shift ROI layout when photo orientation mismatches card layout
 * (e.g. portrait snap of landscape PAN).
 */
export function adjustRegionsForOrientation(
  regions: OcrRegionDef[],
  imageWidth: number,
  imageHeight: number,
  docType: DocType,
): OcrRegionDef[] {
  const isLandscape = imageWidth > imageHeight * 1.08;
  const isPortrait = imageHeight > imageWidth * 1.08;

  if (docType === 'pan' && isPortrait) {
    return regions.map((r) => ({ ...r, rect: rotateRect90CCW(r.rect) }));
  }
  if (docType === 'aadhaar' && isLandscape) {
    return regions.map((r) => ({ ...r, rect: rotateRect90CW(r.rect) }));
  }
  return regions;
}

/** Restrict Tesseract charset for ID number / MRZ regions. */
export function tesseractWhitelistForRegion(regionId: string): string | undefined {
  switch (regionId) {
    case 'pan_number':
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    case 'aadhaar_number':
      return '0123456789 ';
    case 'mrz':
    case 'passport_number':
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
    case 'license_number':
    case 'voter_id':
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/ ';
    case 'dob':
    case 'validity':
      return '0123456789/.- ';
    default:
      return undefined;
  }
}

/** MRZ lines need extra vertical padding for reliable reads. */
export function expandRegionRect(rect: NormalizedRect, padY = 0.02): NormalizedRect {
  return clampRect({
    x: rect.x,
    y: Math.max(0, rect.y - padY),
    w: rect.w,
    h: Math.min(1, rect.h + padY * 2),
  });
}

