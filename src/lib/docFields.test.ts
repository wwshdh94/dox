import { describe, expect, it } from 'vitest';
import {
  computeWarrantyEndDate,
  documentExpiryFromFields,
  emptyFieldsFor,
  fieldSchemaFor,
  normalizeDocFields,
} from './docFields';

describe('docFields', () => {
  it('defines fixed fields per doc type', () => {
    expect(fieldSchemaFor('passport').map((f) => f.key)).toEqual([
      'fullName',
      'passportNumber',
      'dateOfBirth',
      'dateOfIssue',
      'expiryDate',
    ]);
    expect(fieldSchemaFor('aadhaar').map((f) => f.key)).toContain('fathersName');
    expect(fieldSchemaFor('vehicle_puc').map((f) => f.key)).toContain('validTill');
    expect(fieldSchemaFor('health_insurance').map((f) => f.key)).toContain('renewalDate');
    expect(fieldSchemaFor('other')).toEqual([]);
  });

  it('strips fields outside the schema', () => {
    const normalized = normalizeDocFields('passport', {
      fullName: 'Rahul',
      passportNumber: 'Z123',
      expiryDate: '2030-01-01',
      storePhone: '+919999999999',
    });
    expect(normalized.fullName).toBe('Rahul');
    expect(normalized.passportNumber).toBe('Z123');
    expect(normalized.expiryDate).toBe('2030-01-01');
    expect(normalized).not.toHaveProperty('storePhone');
  });

  it('maps field dates to document expiry', () => {
    expect(
      documentExpiryFromFields('vehicle_puc', { validTill: '2026-07-01', registrationNumber: 'MH01' }),
    ).toBe('2026-07-01');
    expect(
      documentExpiryFromFields('health_insurance', { renewalDate: '2026-03-01', insurer: 'Star' }),
    ).toBe('2026-03-01');
  });

  it('computes warranty end date from purchase date', () => {
    expect(computeWarrantyEndDate('2025-06-12', 1, 'years')).toBe('2026-06-12');
    expect(computeWarrantyEndDate('2025-01-15', 6, 'months')).toBe('2025-07-15');
  });

  it('returns empty template for manual entry', () => {
    expect(emptyFieldsFor('lab_report')).toEqual({ labName: '', testDate: '' });
  });
});
