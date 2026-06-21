import type { DocType } from '@/types';

export type FieldInputType = 'text' | 'number' | 'date';

export interface DocFieldDef {
  key: string;
  label: string;
  type?: FieldInputType;
}

/** Canonical extracted fields per document type. */
export const DOC_FIELD_SCHEMAS: Record<DocType, DocFieldDef[]> = {
  passport: [
    { key: 'fullName', label: 'Full name' },
    { key: 'passportNumber', label: 'Passport number' },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { key: 'dateOfIssue', label: 'Date of issue', type: 'date' },
    { key: 'expiryDate', label: 'Expiry date', type: 'date' },
  ],
  pan: [
    { key: 'fullName', label: 'Full name' },
    { key: 'panNumber', label: 'PAN number' },
  ],
  aadhaar: [
    { key: 'fullName', label: 'Full name' },
    { key: 'aadhaarNumber', label: 'Aadhaar number' },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { key: 'fathersName', label: "Father's name" },
  ],
  driving_license: [
    { key: 'fullName', label: 'Full name' },
    { key: 'licenseNumber', label: 'License number' },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { key: 'expiryDate', label: 'Valid until', type: 'date' },
  ],
  voter_id: [
    { key: 'fullName', label: 'Full name' },
    { key: 'voterIdNumber', label: 'EPIC / Voter ID number' },
  ],
  ration_card: [
    { key: 'fullName', label: 'Head of family' },
    { key: 'rationCardNumber', label: 'Ration card number' },
  ],
  vehicle_rc: [
    { key: 'registrationNumber', label: 'Registration number' },
    { key: 'ownerName', label: 'Owner name' },
  ],
  vehicle_puc: [
    { key: 'registrationNumber', label: 'Registration number' },
    { key: 'validTill', label: 'Valid till', type: 'date' },
  ],
  vehicle_insurance: [
    { key: 'registrationNumber', label: 'Registration number' },
    { key: 'insurer', label: 'Insurer' },
    { key: 'policyNumber', label: 'Policy number' },
    { key: 'renewalDate', label: 'Renewal date', type: 'date' },
  ],
  insurance: [
    { key: 'provider', label: 'Provider' },
    { key: 'policyNumber', label: 'Policy number' },
    { key: 'premiumDue', label: 'Premium due', type: 'date' },
    { key: 'renewalDate', label: 'Renewal date', type: 'date' },
  ],
  health_insurance: [
    { key: 'insurer', label: 'Insurer' },
    { key: 'policyNumber', label: 'Policy number' },
    { key: 'sumInsured', label: 'Sum insured' },
    { key: 'renewalDate', label: 'Renewal date', type: 'date' },
  ],
  lab_report: [
    { key: 'labName', label: 'Lab name' },
    { key: 'testDate', label: 'Test date', type: 'date' },
  ],
  prescription: [
    { key: 'doctorName', label: 'Doctor name' },
    { key: 'prescribedDate', label: 'Prescribed date', type: 'date' },
  ],
  vaccination: [
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'dose', label: 'Dose' },
  ],
  medical_bill: [
    { key: 'provider', label: 'Provider / hospital' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'billDate', label: 'Bill date', type: 'date' },
  ],
  discharge_summary: [
    { key: 'hospital', label: 'Hospital' },
    { key: 'dischargeDate', label: 'Discharge date', type: 'date' },
  ],
  purchase_receipt: [
    { key: 'productName', label: 'Product' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'storeName', label: 'Store' },
    { key: 'purchaseDate', label: 'Purchase date', type: 'date' },
    { key: 'warrantyUntil', label: 'Warranty valid until', type: 'date' },
  ],
  warranty: [
    { key: 'productName', label: 'Product' },
    { key: 'warrantyUntil', label: 'Warranty until', type: 'date' },
  ],
  other: [],
};

const INSURANCE_TYPES: DocType[] = ['vehicle_insurance', 'insurance', 'health_insurance'];

export function fieldSchemaFor(docType: DocType): DocFieldDef[] {
  return DOC_FIELD_SCHEMAS[docType] ?? [];
}

export function emptyFieldsFor(docType: DocType): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fieldSchemaFor(docType)) out[f.key] = '';
  return out;
}

export function fieldLabelFor(docType: DocType, key: string): string {
  return fieldSchemaFor(docType).find((f) => f.key === key)?.label ?? key;
}

/** Primary identifier shown on home document pills (masked until revealed). */
const PRIMARY_REVEAL_FIELD: Partial<Record<DocType, string>> = {
  passport: 'passportNumber',
  pan: 'panNumber',
  aadhaar: 'aadhaarNumber',
  driving_license: 'licenseNumber',
  voter_id: 'voterIdNumber',
  ration_card: 'rationCardNumber',
  vehicle_rc: 'registrationNumber',
  vehicle_puc: 'registrationNumber',
  vehicle_insurance: 'policyNumber',
  insurance: 'policyNumber',
  health_insurance: 'policyNumber',
};

export function primaryRevealField(docType: DocType): string | undefined {
  return PRIMARY_REVEAL_FIELD[docType];
}

export function primaryRevealValue(
  docType: DocType,
  fields: Record<string, string>,
): string | undefined {
  const key = primaryRevealField(docType);
  if (!key) return undefined;
  const value = fields[key];
  return value ? String(value) : undefined;
}

/** Keep only schema keys; coerce values to strings for form state. */
export function normalizeDocFields(
  docType: DocType,
  raw: Record<string, string | number | null | undefined>,
): Record<string, string> {
  const allowed = new Set(fieldSchemaFor(docType).map((f) => f.key));
  const out = emptyFieldsFor(docType);
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key) || value == null || value === '') continue;
    out[key] = String(value);
  }
  return out;
}

/** Document types whose expiry/reminder date lives in extracted fields (not the top-level picker). */
export function usesFieldBasedExpiry(docType: DocType): boolean {
  return (
    docType === 'passport' ||
    docType === 'driving_license' ||
    docType === 'vehicle_puc' ||
    INSURANCE_TYPES.includes(docType) ||
    docType === 'purchase_receipt'
  );
}

/** Map schema date fields to document-level expiry for reminders. */
export function documentExpiryFromFields(
  docType: DocType,
  fields: Record<string, string>,
  fallback?: string,
): string | undefined {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = fields[key];
      if (value) return value;
    }
    return undefined;
  };

  switch (docType) {
    case 'passport':
    case 'driving_license':
      return pick('expiryDate') ?? fallback;
    case 'vehicle_puc':
      return pick('validTill') ?? fallback;
    case 'vehicle_insurance':
    case 'insurance':
    case 'health_insurance':
      return pick('renewalDate') ?? fallback;
    case 'purchase_receipt':
      return pick('warrantyUntil') ?? fallback;
    default:
      return fallback;
  }
}

/** Pull document-level expiry from OCR / field output when present. */
export function extractExpiryDate(
  docType: DocType,
  raw: Record<string, string | number | null | undefined>,
): string | undefined {
  return documentExpiryFromFields(docType, normalizeDocFields(docType, raw));
}

export function computeWarrantyEndDate(
  purchaseDate: string,
  duration: number,
  unit: 'months' | 'years',
): string {
  if (!purchaseDate || !Number.isFinite(duration) || duration <= 0) return '';
  const base = new Date(purchaseDate);
  if (Number.isNaN(base.getTime())) return '';
  const end = new Date(base);
  if (unit === 'years') end.setFullYear(end.getFullYear() + duration);
  else end.setMonth(end.getMonth() + duration);
  return end.toISOString().slice(0, 10);
}
