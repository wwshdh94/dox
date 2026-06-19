import { describe, expect, it } from 'vitest';
import { redactFieldValue, redactFields } from './bundleShare';

describe('bundleShare', () => {
  it('masks aadhaar', () => {
    expect(redactFieldValue('aadhaarNumber', '123456789012')).toBe('XXXX-XXXX-9012');
  });

  it('masks pan partially', () => {
    expect(redactFieldValue('panNumber', 'ABCDE1234F')).toBe('ABXXXX4F');
  });

  it('redacts all fields', () => {
    expect(redactFields({ aadhaarNumber: '123456789012', name: 'Rahul' })).toEqual({
      aadhaarNumber: 'XXXX-XXXX-9012',
      name: 'Rahul',
    });
  });
});
