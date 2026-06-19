import type { Document, DocType } from '@/types';

const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
const AMOUNT_RE = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i;
const PHONE_RE = /(?:\+91[\s-]?)?[6-9]\d{9}/;

export interface OcrResult {
  rawText: string;
  confidence: number;
  fields: Record<string, string | number>;
}

/** Mock on-device OCR — regex heuristics, no cloud */
export async function extractOnDevice(
  fileName: string,
  docType: DocType,
): Promise<OcrResult> {
  await new Promise((r) => setTimeout(r, 400));

  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  const fields: Record<string, string | number> = {};
  let rawText = `Scanned: ${base}`;

  if (docType === 'purchase_receipt') {
    const amountMatch = base.match(/(\d{5,7})/);
    fields.productName = base.includes('mac') ? 'MacBook Pro' : base.slice(0, 40) || 'Product';
    fields.amount = amountMatch ? Number(amountMatch[1]) : 0;
    fields.storeName = base.toLowerCase().includes('imagine') ? 'Imagine Apple Reseller' : 'Store';
    fields.purchaseDate = new Date().toISOString().slice(0, 10);
    rawText += '\n₹' + (fields.amount || '0');
  } else if (docType === 'vehicle_rc' || docType === 'vehicle_insurance') {
    const reg = base.match(/[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}/i);
    fields.registrationNumber = reg ? reg[0].toUpperCase() : '';
    fields.ownerName = 'Owner';
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    fields.expiryDate = future.toISOString().slice(0, 10);
  } else if (docType === 'passport') {
    fields.passportNumber = 'Z' + Math.floor(1000000 + Math.random() * 9000000);
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    fields.expiryDate = future.toISOString().slice(0, 10);
    fields.fullName = 'Passport Holder';
  } else if (docType === 'health_insurance') {
    fields.insurer = base.toLowerCase().includes('star') ? 'Star Health' : 'Health insurer';
    fields.policyNumber = 'SH-' + Math.floor(100000 + Math.random() * 900000);
    fields.sumInsured = '500000';
    const future = new Date();
    future.setMonth(future.getMonth() + 8);
    fields.expiryDate = future.toISOString().slice(0, 10);
  } else if (docType === 'lab_report') {
    fields.labName = 'Thyrocare';
    fields.testDate = new Date().toISOString().slice(0, 10);
  } else if (docType === 'prescription') {
    fields.doctorName = 'Dr. Sharma';
    fields.prescribedDate = new Date().toISOString().slice(0, 10);
  } else if (docType === 'vaccination') {
    fields.vaccine = 'Covishield';
    fields.dose = 'Booster';
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    fields.expiryDate = future.toISOString().slice(0, 10);
  } else if (docType === 'insurance') {
    fields.provider = 'Insurance Co';
    fields.policyNumber = 'POL' + Math.floor(100000 + Math.random() * 900000);
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    fields.expiryDate = future.toISOString().slice(0, 10);
  }

  const amountFromText = rawText.match(AMOUNT_RE);
  if (amountFromText && !fields.amount) {
    fields.amount = Number(amountFromText[1].replace(/,/g, ''));
  }

  const phone = rawText.match(PHONE_RE);
  if (phone) fields.storePhone = phone[0];

  DATE_RE.lastIndex = 0;
  const dateMatch = DATE_RE.exec(rawText);
  if (dateMatch && !fields.purchaseDate) {
    const [, d, m, y] = dateMatch;
    const year = y.length === 2 ? `20${y}` : y;
    fields.purchaseDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return { rawText, confidence: Object.keys(fields).length > 2 ? 0.75 : 0.45, fields };
}

export function findDuplicate(
  docs: Document[],
  docType: DocType,
  fields: Record<string, unknown>,
): Document | undefined {
  const reg = fields.registrationNumber as string | undefined;
  const serial = fields.serialNumber as string | undefined;
  const policy = fields.policyNumber as string | undefined;

  return docs.find((d) => {
    if (d.docType !== docType) return false;
    if (reg && d.fields.registrationNumber === reg) return true;
    if (serial && d.fields.serialNumber === serial) return true;
    if (policy && d.fields.policyNumber === policy) return true;
    return false;
  });
}
