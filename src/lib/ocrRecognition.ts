import { normalizeDocFields } from '@/lib/docFields';
import type { OcrResult } from '@/lib/ocr';
import type { DocType } from '@/types';

export type SelectedDocType = DocType | '';

export function isBlankDocType(type: SelectedDocType): boolean {
  return type === '';
}

/** Doc type for storage when user has not chosen one yet. */
export function storageDocType(type: SelectedDocType): DocType {
  return type || 'other';
}

function fieldStr(fields: Record<string, string | number>, key: string): string {
  return String(fields[key] ?? '').trim();
}

export function countRecognizedFields(fields: Record<string, string | number>): number {
  return Object.values(fields).filter((v) => v !== '' && v != null).length;
}

/** Infer document type from extracted field keys/values. */
export function inferDocTypeFromFields(fields: Record<string, string | number>): DocType | null {
  if (fieldStr(fields, 'panNumber')) return 'pan';
  if (fieldStr(fields, 'aadhaarNumber')) return 'aadhaar';
  if (fieldStr(fields, 'passportNumber')) return 'passport';
  if (fieldStr(fields, 'licenseNumber')) return 'driving_license';
  if (fieldStr(fields, 'voterIdNumber')) return 'voter_id';
  if (fieldStr(fields, 'rationCardNumber')) return 'ration_card';
  if (fieldStr(fields, 'registrationNumber')) {
    if (fieldStr(fields, 'validTill')) return 'vehicle_puc';
    if (fieldStr(fields, 'insurer') || fieldStr(fields, 'policyNumber')) return 'vehicle_insurance';
    return 'vehicle_rc';
  }
  if (fieldStr(fields, 'productName') && fieldStr(fields, 'warrantyUntil') && !fieldStr(fields, 'amount')) {
    return 'warranty';
  }
  if (fieldStr(fields, 'productName') && (fieldStr(fields, 'amount') || fieldStr(fields, 'storeName'))) {
    return 'purchase_receipt';
  }
  if (fieldStr(fields, 'labName') || fieldStr(fields, 'testDate')) return 'lab_report';
  if (fieldStr(fields, 'doctorName') || fieldStr(fields, 'prescribedDate')) return 'prescription';
  if (fieldStr(fields, 'vaccine')) return 'vaccination';
  if (fieldStr(fields, 'hospital') && fieldStr(fields, 'dischargeDate')) return 'discharge_summary';
  if (fieldStr(fields, 'provider') && fieldStr(fields, 'billDate')) return 'medical_bill';
  if (fieldStr(fields, 'policyNumber') && fieldStr(fields, 'insurer')) return 'health_insurance';
  if (fieldStr(fields, 'policyNumber')) return 'insurance';
  return null;
}

export function isOcrRecognitionSuccessful(
  result: Pick<OcrResult, 'confidence' | 'fields' | 'rawText'>,
): boolean {
  const filled = countRecognizedFields(result.fields);
  if (inferDocTypeFromFields(result.fields)) return true;
  if (filled >= 2 && result.confidence >= 0.45) return true;
  if (filled >= 1 && result.confidence >= 0.62) return true;
  const textLen = result.rawText?.trim().length ?? 0;
  return filled >= 1 && textLen >= 40 && result.confidence >= 0.35;
}

export interface ResolvedDocTypeAfterOcr {
  docType: DocType;
  needsDocTypeSelection: boolean;
  fields: Record<string, string | number>;
}

export function resolveDocTypeAfterOcr(
  requestedType: DocType,
  userPickedType: boolean,
  result: OcrResult,
): ResolvedDocTypeAfterOcr {
  if (!isOcrRecognitionSuccessful(result)) {
    return {
      docType: 'other',
      needsDocTypeSelection: true,
      fields: {},
    };
  }

  const inferred = inferDocTypeFromFields(result.fields);

  if (userPickedType && requestedType !== 'other') {
    return {
      docType: requestedType,
      needsDocTypeSelection: false,
      fields: normalizeDocFields(requestedType, result.fields),
    };
  }

  if (inferred) {
    return {
      docType: inferred,
      needsDocTypeSelection: false,
      fields: normalizeDocFields(inferred, result.fields),
    };
  }

  return {
    docType: 'other',
    needsDocTypeSelection: true,
    fields: normalizeDocFields('other', result.fields),
  };
}
