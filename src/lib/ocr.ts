import type { Document, DocType } from '@/types';
import { aadhaarQrToFields, scanAadhaarQrFromDataUrl } from '@/lib/aadhaarQr';
import { emptyFieldsFor, extractExpiryDate, normalizeDocFields } from '@/lib/docFields';
import {
  parseDocFieldsForType,
  parseAadhaarFromText,
} from '@/lib/idDocParser';
import { extractCloudOcr } from '@/lib/ocrCloud';
import { recognizeImageText } from '@/lib/ocrImage';
import {
  chooseInitialExtractMode,
  isImageDataUrl,
  shouldEscalateToCloud,
  shouldExtractFromUpload,
} from '@/lib/ocrRoute';
import { isOcrRecognitionSuccessful } from '@/lib/ocrRecognition';
import { shouldSkipCloudOcr } from '@/lib/ocrSkip';

export interface OcrResult {
  rawText: string;
  confidence: number;
  fields: Record<string, string | number>;
  expiryDate?: string;
  source?: 'on_device' | 'cloud';
}

export interface ExtractOnDeviceOptions {
  fileName: string;
  docType: DocType;
  /** data:image/... from uploaded scan */
  fileDataUrl?: string;
  /** Skip Tesseract — parse supplied OCR text (tests / replay) */
  ocrText?: string;
  /** Multi-page index (Aadhaar front=0, back=1). */
  pageIndex?: number;
}

export type ExtractMode = 'on_device' | 'cloud';

export interface ExtractDocumentOptions extends ExtractOnDeviceOptions {
  mode?: ExtractMode;
}

const ID_DOC_TYPES = new Set<DocType>([
  'pan',
  'aadhaar',
  'passport',
  'driving_license',
  'voter_id',
]);

function buildIdDocOcrResult(
  docType: DocType,
  rawText: string,
  ocrConfidence: number,
  opts?: {
    cloudFields?: Record<string, string>;
    regions?: Record<string, string>;
    pageIndex?: number;
  },
): OcrResult | null {
  if (!ID_DOC_TYPES.has(docType)) return null;

  const parsed = parseDocFieldsForType(docType, {
    rawText,
    regions: opts?.regions,
    pageIndex: opts?.pageIndex ?? 0,
  });
  if (!parsed) return null;

  const raw: Record<string, string | number> = {
    ...emptyFieldsFor(docType),
    ...(opts?.cloudFields ?? {}),
  };

  if (docType === 'pan' && 'panNumber' in parsed) {
    raw.panNumber = parsed.panNumber;
    if (parsed.fullName) raw.fullName = parsed.fullName;
    if (parsed.fathersName) raw.fathersName = parsed.fathersName;
    if (parsed.dateOfBirth) raw.dateOfBirth = parsed.dateOfBirth;
  } else if (docType === 'aadhaar' && 'aadhaarNumber' in parsed) {
    raw.aadhaarNumber = parsed.aadhaarNumber;
    if (parsed.fullName) raw.fullName = parsed.fullName;
    if (parsed.dateOfBirth) raw.dateOfBirth = parsed.dateOfBirth;
    if (parsed.fathersName) raw.fathersName = parsed.fathersName;
  } else if (docType === 'passport' && 'passportNumber' in parsed) {
    raw.passportNumber = parsed.passportNumber;
    if (parsed.fullName) raw.fullName = parsed.fullName;
    if (parsed.dateOfBirth) raw.dateOfBirth = parsed.dateOfBirth;
    if (parsed.expiryDate) raw.expiryDate = parsed.expiryDate;
    if (parsed.dateOfIssue) raw.dateOfIssue = parsed.dateOfIssue;
  } else if (docType === 'driving_license' && 'licenseNumber' in parsed) {
    raw.licenseNumber = parsed.licenseNumber;
    if (parsed.fullName) raw.fullName = parsed.fullName;
    if (parsed.dateOfBirth) raw.dateOfBirth = parsed.dateOfBirth;
    if (parsed.expiryDate) raw.expiryDate = parsed.expiryDate;
  } else if (docType === 'voter_id' && 'voterIdNumber' in parsed) {
    raw.voterIdNumber = parsed.voterIdNumber;
    if (parsed.fullName) raw.fullName = parsed.fullName;
    if (parsed.dateOfBirth) raw.dateOfBirth = parsed.dateOfBirth;
  }

  const fields = normalizeDocFields(docType, raw);
  const filled = Object.values(fields).filter((v) => v !== '').length;
  if (filled === 0) return null;

  return {
    rawText: rawText || `Parsed ${docType}`,
    confidence: Math.max(parsed.confidence, ocrConfidence, filled > 1 ? 0.75 : 0.45),
    fields,
    expiryDate: extractExpiryDate(docType, raw),
  };
}

function applyIdDocParse(
  docType: DocType,
  rawText: string,
  ocrConfidence: number,
  cloudFields?: Record<string, string>,
  regions?: Record<string, string>,
  pageIndex?: number,
): OcrResult | null {
  const idResult = buildIdDocOcrResult(docType, rawText, ocrConfidence, {
    cloudFields,
    regions,
    pageIndex,
  });
  if (idResult) return idResult;

  if (cloudFields && Object.keys(cloudFields).length > 0) {
    const raw: Record<string, string | number> = { ...emptyFieldsFor(docType), ...cloudFields };
    const fields = normalizeDocFields(docType, raw);
    const filled = Object.values(fields).filter((v) => v !== '').length;
    if (filled > 0) {
      return {
        rawText: rawText || `Cloud ${docType}`,
        confidence: Math.max(ocrConfidence, 0.85),
        fields,
        expiryDate: extractExpiryDate(docType, raw),
      };
    }
  }

  return null;
}

export async function extractDocument(opts: ExtractDocumentOptions): Promise<OcrResult> {
  const mode = opts.mode ?? 'on_device';

  if (mode === 'cloud' && opts.fileDataUrl?.startsWith('data:image/') && !opts.ocrText) {
    try {
      const cloud = await extractCloudOcr({
        docType: opts.docType,
        fileName: opts.fileName,
        fileDataUrl: opts.fileDataUrl,
      });
      const parsed = applyIdDocParse(
        opts.docType,
        cloud.ocrText,
        cloud.confidence,
        cloud.fields,
        undefined,
        opts.pageIndex,
      );
      if (parsed) {
        return { ...parsed, source: 'cloud' };
      }
      if (cloud.ocrText) {
        const fallback = await extractOnDevice({
          ...opts,
          ocrText: cloud.ocrText,
        });
        return { ...fallback, confidence: Math.max(fallback.confidence, cloud.confidence), source: 'cloud' };
      }
    } catch {
      /* fall through to on-device */
    }
  }

  const onDevice = await extractOnDevice(opts);
  return { ...onDevice, source: 'on_device' };
}

/** Mock on-device OCR — Tesseract for images; regex heuristics as fallback */
export async function extractOnDevice(
  fileNameOrOptions: string | ExtractOnDeviceOptions,
  docTypeArg?: DocType,
): Promise<OcrResult> {
  const opts: ExtractOnDeviceOptions =
    typeof fileNameOrOptions === 'string'
      ? { fileName: fileNameOrOptions, docType: docTypeArg! }
      : fileNameOrOptions;

  const { fileName, docType } = opts;
  const pageIndex = opts.pageIndex ?? 0;
  let rawText = '';
  let ocrConfidence = 0;
  let ocrRegions: Record<string, string> | undefined;

  if (opts.ocrText) {
    rawText = opts.ocrText;
    ocrConfidence = 0.7;
  } else if (opts.fileDataUrl?.startsWith('data:image/')) {
    try {
      const recognized = await recognizeImageText(opts.fileDataUrl, {
        docType,
        pageIndex,
      });
      rawText = recognized.text;
      ocrConfidence = recognized.confidence;
      ocrRegions = recognized.regions;
    } catch {
      rawText = '';
      ocrConfidence = 0;
    }
  }

  // Aadhaar Secure QR — try before OCR text parsing (image uploads only)
  if (
    docType === 'aadhaar' &&
    opts.fileDataUrl?.startsWith('data:image/') &&
    !opts.ocrText
  ) {
    const qr = await scanAadhaarQrFromDataUrl(opts.fileDataUrl);
    if (qr) {
      const ocrParsed = rawText ? parseAadhaarFromText(rawText) : null;
      const raw: Record<string, string | number> = {
        ...emptyFieldsFor(docType),
        ...aadhaarQrToFields(qr),
      };
      if (ocrParsed?.aadhaarNumber) raw.aadhaarNumber = ocrParsed.aadhaarNumber;
      if (!raw.fullName && ocrParsed?.fullName) raw.fullName = ocrParsed.fullName;
      if (!raw.dateOfBirth && ocrParsed?.dateOfBirth) raw.dateOfBirth = ocrParsed.dateOfBirth;
      if (!raw.fathersName && ocrParsed?.fathersName) raw.fathersName = ocrParsed.fathersName;

      const fields = normalizeDocFields(docType, raw);
      const filled = Object.values(fields).filter((v) => v !== '').length;
      if (filled > 0) {
        return {
          rawText: rawText || 'Aadhaar Secure QR',
          confidence: Math.max(qr.confidence, ocrConfidence, filled > 2 ? 0.92 : 0.85),
          fields,
          expiryDate: extractExpiryDate(docType, raw),
        };
      }
    }
  }

  const idParsed = buildIdDocOcrResult(docType, rawText, ocrConfidence, {
    regions: ocrRegions,
    pageIndex,
  });
  if (idParsed) return idParsed;

  // Filename / demo fallback for other types and when OCR misses
  await new Promise((r) => setTimeout(r, rawText ? 80 : 400));

  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  const raw: Record<string, string | number> = { ...emptyFieldsFor(docType) };
  if (!rawText) rawText = `Scanned: ${base}`;

  if (docType === 'purchase_receipt') {
    const amountMatch = base.match(/(\d{5,7})/);
    raw.productName = base.includes('mac') ? 'MacBook Pro' : base.slice(0, 40) || 'Product';
    raw.amount = amountMatch ? Number(amountMatch[1]) : 0;
    raw.storeName = base.toLowerCase().includes('imagine') ? 'Imagine Apple Reseller' : 'Store';
    raw.purchaseDate = new Date().toISOString().slice(0, 10);
    rawText += '\n₹' + (raw.amount || '0');
  } else if (docType === 'vehicle_rc') {
    const reg = base.match(/[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}/i);
    raw.registrationNumber = reg ? reg[0].toUpperCase() : '';
    raw.ownerName = 'Owner';
    raw.expiryDate = yearAhead();
  } else if (docType === 'vehicle_puc') {
    const reg = base.match(/[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}/i);
    raw.registrationNumber = reg ? reg[0].toUpperCase() : '';
    raw.validTill = monthsAhead(6);
  } else if (docType === 'vehicle_insurance') {
    const reg = base.match(/[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}/i);
    raw.registrationNumber = reg ? reg[0].toUpperCase() : '';
    raw.insurer = 'HDFC ERGO';
    raw.policyNumber = 'POL' + Math.floor(100000 + Math.random() * 900000);
    raw.renewalDate = yearAhead();
  } else if (docType === 'passport') {
    raw.passportNumber = 'Z' + Math.floor(1000000 + Math.random() * 9000000);
    raw.dateOfIssue = yearsAgo(5);
    raw.expiryDate = yearsAhead(5);
    raw.fullName = 'Passport Holder';
  } else if (docType === 'pan') {
    const fromName = base.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i);
    raw.panNumber = fromName?.[1]?.toUpperCase() ?? '';
    raw.fullName = base.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i, '').trim() || '';
  } else if (docType === 'aadhaar') {
    const digits = base.replace(/\D/g, '');
    raw.aadhaarNumber = digits.length === 12 ? digits : '';
    raw.fullName = '';
    raw.dateOfBirth = '';
    raw.fathersName = '';
  } else if (docType === 'driving_license') {
    raw.licenseNumber = 'DL' + Math.floor(10000000000 + Math.random() * 90000000000);
    raw.fullName = 'License Holder';
    raw.dateOfBirth = '1990-01-01';
    raw.expiryDate = yearsAhead(10);
  } else if (docType === 'voter_id') {
    raw.voterIdNumber = 'ABC' + Math.floor(1000000 + Math.random() * 9000000);
    raw.fullName = 'Voter Name';
  } else if (docType === 'ration_card') {
    raw.rationCardNumber = 'RC' + Math.floor(100000 + Math.random() * 900000);
    raw.fullName = 'Family Head';
  } else if (docType === 'health_insurance') {
    raw.insurer = base.toLowerCase().includes('star') ? 'Star Health' : 'Health insurer';
    raw.policyNumber = 'SH-' + Math.floor(100000 + Math.random() * 900000);
    raw.sumInsured = '500000';
    raw.renewalDate = monthsAhead(8);
  } else if (docType === 'lab_report') {
    raw.labName = 'Thyrocare';
    raw.testDate = new Date().toISOString().slice(0, 10);
  } else if (docType === 'prescription') {
    raw.doctorName = 'Dr. Sharma';
    raw.prescribedDate = new Date().toISOString().slice(0, 10);
  } else if (docType === 'vaccination') {
    raw.vaccine = 'Covishield';
    raw.dose = 'Booster';
    raw.expiryDate = yearAhead();
  } else if (docType === 'medical_bill') {
    raw.provider = 'City Hospital';
    raw.amount = 2500;
    raw.billDate = new Date().toISOString().slice(0, 10);
  } else if (docType === 'discharge_summary') {
    raw.hospital = 'City Hospital';
    raw.dischargeDate = new Date().toISOString().slice(0, 10);
  } else if (docType === 'insurance') {
    raw.provider = 'Insurance Co';
    raw.policyNumber = 'POL' + Math.floor(100000 + Math.random() * 900000);
    raw.premiumDue = monthsAhead(6);
    raw.renewalDate = monthsAhead(6);
  } else if (docType === 'warranty') {
    raw.productName = base.slice(0, 40) || 'Product';
    raw.warrantyUntil = yearAhead();
  }

  const expiryDate = extractExpiryDate(docType, raw);
  const fields = normalizeDocFields(docType, raw);
  const filled = Object.values(fields).filter((v) => v !== '').length;
  const fallbackConfidence = filled > 1 ? 0.45 : 0.25;

  return {
    rawText,
    confidence: rawText && ocrConfidence > 0 ? Math.max(ocrConfidence * 0.5, fallbackConfidence) : fallbackConfidence,
    fields,
    expiryDate,
  };
}

function yearAhead(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function yearsAhead(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}

function yearsAgo(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

function monthsAhead(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function mergeOcrFieldMaps(
  a: Record<string, string | number>,
  b: Record<string, string | number>,
): Record<string, string | number> {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (value !== '' && value != null && (out[key] === '' || out[key] == null)) {
      out[key] = value;
    }
  }
  return out;
}

/** Run OCR on each page and merge fields (e.g. Aadhaar front + back). */
export async function extractDocumentFromPages(
  opts: ExtractDocumentOptions & { additionalFileDataUrls?: string[] },
): Promise<OcrResult> {
  const pages = [opts.fileDataUrl, ...(opts.additionalFileDataUrls ?? [])].filter(
    (url): url is string => Boolean(url),
  );
  if (pages.length <= 1) return extractDocument(opts);

  let merged: OcrResult | null = null;
  for (let i = 0; i < pages.length; i++) {
    const result = await extractDocument({
      ...opts,
      fileDataUrl: pages[i],
      fileName: i === 0 ? opts.fileName : `${opts.fileName}-page-${i + 1}`,
      pageIndex: i,
    });
    if (!merged) {
      merged = result;
      continue;
    }
    merged = {
      ...merged,
      rawText: `${merged.rawText}\n---\n${result.rawText}`,
      confidence: Math.max(merged.confidence, result.confidence),
      fields: normalizeDocFields(
        opts.docType,
        mergeOcrFieldMaps(merged.fields, result.fields),
      ),
      expiryDate: merged.expiryDate ?? result.expiryDate,
      source: merged.source ?? result.source,
    };
  }
  return merged!;
}

export interface ExtractAutoOptions extends ExtractOnDeviceOptions {
  additionalFileDataUrls?: string[];
  cloudAllowed: boolean;
}

function countFilledFields(fields: Record<string, string | number>): number {
  return Object.values(fields).filter((v) => v !== '' && v != null).length;
}

/** On-device first; escalate to cloud when allowed and confidence is low. */
export async function extractDocumentAuto(opts: ExtractAutoOptions): Promise<OcrResult> {
  const hasImage =
    isImageDataUrl(opts.fileDataUrl) ||
    (opts.additionalFileDataUrls ?? []).some((url) => isImageDataUrl(url));

  if (!shouldExtractFromUpload(opts) && !hasImage) {
    return {
      rawText: '',
      confidence: 0,
      fields: emptyFieldsFor(opts.docType),
      source: 'on_device',
    };
  }

  const initialMode = chooseInitialExtractMode({
    docType: opts.docType,
    cloudAllowed: opts.cloudAllowed,
    hasImage,
  });

  let result = await extractDocument({ ...opts, mode: initialMode });

  if (shouldSkipCloudOcr(result.rawText) && !isOcrRecognitionSuccessful(result)) {
    return {
      rawText: '',
      confidence: 0,
      fields: emptyFieldsFor(opts.docType),
      source: 'on_device',
    };
  }

  const filled = countFilledFields(result.fields);

  if (
    shouldEscalateToCloud({
      docType: opts.docType,
      confidence: result.confidence,
      filledFields: filled,
      cloudAllowed: opts.cloudAllowed,
      alreadyCloud: result.source === 'cloud',
    }) &&
    !shouldSkipCloudOcr(result.rawText)
  ) {
    const cloudResult = await extractDocument({ ...opts, mode: 'cloud' });
    const cloudFilled = countFilledFields(cloudResult.fields);
    if (cloudResult.confidence > result.confidence || cloudFilled > filled) {
      result = cloudResult;
    }
  }

  return result;
}

/** Multi-page auto extraction (e.g. Aadhaar front + back). */
export async function extractDocumentFromPagesAuto(opts: ExtractAutoOptions): Promise<OcrResult> {
  const pages = [opts.fileDataUrl, ...(opts.additionalFileDataUrls ?? [])].filter(
    (url): url is string => Boolean(url),
  );
  if (pages.length <= 1) return extractDocumentAuto(opts);

  let merged: OcrResult | null = null;
  for (let i = 0; i < pages.length; i++) {
    const result = await extractDocumentAuto({
      ...opts,
      fileDataUrl: pages[i],
      additionalFileDataUrls: undefined,
      fileName: i === 0 ? opts.fileName : `${opts.fileName}-page-${i + 1}`,
    });
    if (!merged) {
      merged = result;
      continue;
    }
    merged = {
      ...merged,
      rawText: `${merged.rawText}\n---\n${result.rawText}`,
      confidence: Math.max(merged.confidence, result.confidence),
      fields: normalizeDocFields(
        opts.docType,
        mergeOcrFieldMaps(merged.fields, result.fields),
      ),
      expiryDate: merged.expiryDate ?? result.expiryDate,
      source: merged.source === 'cloud' || result.source === 'cloud' ? 'cloud' : 'on_device',
    };
  }
  return merged!;
}

export function findDuplicate(
  docs: Document[],
  docType: DocType,
  fields: Record<string, unknown>,
): Document | undefined {
  const reg = fields.registrationNumber as string | undefined;
  const serial = fields.serialNumber as string | undefined;
  const policy = fields.policyNumber as string | undefined;
  const pan = fields.panNumber as string | undefined;
  const aadhaar = fields.aadhaarNumber as string | undefined;

  return docs.find((d) => {
    if (d.docType !== docType) return false;
    if (reg && d.fields.registrationNumber === reg) return true;
    if (serial && d.fields.serialNumber === serial) return true;
    if (policy && d.fields.policyNumber === policy) return true;
    if (pan && d.fields.panNumber === pan) return true;
    if (aadhaar && d.fields.aadhaarNumber === aadhaar) return true;
    return false;
  });
}
