import type { DocType } from '@/types';

export const HEALTH_DOC_TYPES: DocType[] = [
  'health_insurance',
  'lab_report',
  'prescription',
  'vaccination',
  'medical_bill',
  'discharge_summary',
];

export const HEALTH_CATEGORY_LABELS: Record<string, string> = {
  health_insurance: 'Insurance',
  lab_report: 'Lab reports',
  prescription: 'Prescriptions',
  vaccination: 'Vaccinations',
  medical_bill: 'Medical bills',
  discharge_summary: 'Discharge summaries',
};

export function isHealthDoc(docType: DocType): boolean {
  return HEALTH_DOC_TYPES.includes(docType);
}

export function hasEmergencyInfo(summary?: {
  bloodGroup?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}): boolean {
  if (!summary) return false;
  return !!(summary.bloodGroup || summary.allergies || summary.emergencyContact || summary.emergencyPhone);
}
