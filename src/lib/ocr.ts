import type { Document, DocType } from '@/types';
import { emptyFieldsFor, extractExpiryDate, normalizeDocFields } from '@/lib/docFields';

export interface OcrResult {
  rawText: string;
  confidence: number;
  fields: Record<string, string | number>;
  expiryDate?: string;
}

/** Mock on-device OCR — regex heuristics, no cloud */
export async function extractOnDevice(
  fileName: string,
  docType: DocType,
): Promise<OcrResult> {
  await new Promise((r) => setTimeout(r, 400));

  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  const raw: Record<string, string | number> = { ...emptyFieldsFor(docType) };
  let rawText = `Scanned: ${base}`;

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
    raw.panNumber = 'ABCDE1234F';
    raw.fullName = 'PAN Holder';
  } else if (docType === 'aadhaar') {
    raw.aadhaarNumber = '123456789012';
    raw.fullName = 'Aadhaar Holder';
    raw.dateOfBirth = '1990-01-01';
    raw.fathersName = 'Father Name';
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

  return {
    rawText,
    confidence: filled > 1 ? 0.75 : 0.45,
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

  return docs.find((d) => {
    if (d.docType !== docType) return false;
    if (reg && d.fields.registrationNumber === reg) return true;
    if (serial && d.fields.serialNumber === serial) return true;
    if (policy && d.fields.policyNumber === policy) return true;
    return false;
  });
}
