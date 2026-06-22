import type { Document, DocType } from '@/types';
import { emptyFieldsFor, extractExpiryDate, normalizeDocFields } from '@/lib/docFields';
import { parseAadhaarFromText, parsePanFromText } from '@/lib/idDocParser';
import { recognizeImageText } from '@/lib/ocrImage';

export interface OcrResult {
  rawText: string;
  confidence: number;
  fields: Record<string, string | number>;
  expiryDate?: string;
}

export interface ExtractOnDeviceOptions {
  fileName: string;
  docType: DocType;
  /** data:image/... from uploaded scan */
  fileDataUrl?: string;
  /** Skip Tesseract — parse supplied OCR text (tests / replay) */
  ocrText?: string;
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
  let rawText = '';
  let ocrConfidence = 0;

  if (opts.ocrText) {
    rawText = opts.ocrText;
    ocrConfidence = 0.7;
  } else if (opts.fileDataUrl?.startsWith('data:image/')) {
    try {
      const recognized = await recognizeImageText(opts.fileDataUrl);
      rawText = recognized.text;
      ocrConfidence = recognized.confidence;
    } catch {
      rawText = '';
      ocrConfidence = 0;
    }
  }

  if (docType === 'pan') {
    const parsed = parsePanFromText(rawText);
    if (parsed) {
      const raw: Record<string, string | number> = { ...emptyFieldsFor(docType) };
      raw.panNumber = parsed.panNumber;
      if (parsed.fullName) raw.fullName = parsed.fullName;
      const fields = normalizeDocFields(docType, raw);
      const filled = Object.values(fields).filter((v) => v !== '').length;
      return {
        rawText: rawText || 'Parsed pan',
        confidence: Math.max(parsed.confidence, ocrConfidence, filled > 1 ? 0.75 : 0.45),
        fields,
        expiryDate: extractExpiryDate(docType, raw),
      };
    }
  } else if (docType === 'aadhaar') {
    const parsed = parseAadhaarFromText(rawText);
    if (parsed) {
      const raw: Record<string, string | number> = { ...emptyFieldsFor(docType) };
      raw.aadhaarNumber = parsed.aadhaarNumber;
      if (parsed.fullName) raw.fullName = parsed.fullName;
      if (parsed.dateOfBirth) raw.dateOfBirth = parsed.dateOfBirth;
      if (parsed.fathersName) raw.fathersName = parsed.fathersName;
      const fields = normalizeDocFields(docType, raw);
      const filled = Object.values(fields).filter((v) => v !== '').length;
      return {
        rawText: rawText || 'Parsed aadhaar',
        confidence: Math.max(parsed.confidence, ocrConfidence, filled > 1 ? 0.75 : 0.45),
        fields,
        expiryDate: extractExpiryDate(docType, raw),
      };
    }
  }

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
