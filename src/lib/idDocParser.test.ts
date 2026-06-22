import { describe, expect, it } from 'vitest';
import {
  isValidAadhaarNumber,
  normalizeOcrText,
  parseAadhaarFromText,
  parsePanFromText,
} from './idDocParser';

describe('idDocParser', () => {
  it('validates Aadhaar with Verhoeff checksum', () => {
    expect(isValidAadhaarNumber('234567890121')).toBe(true);
    expect(isValidAadhaarNumber('123456789012')).toBe(false);
    expect(isValidAadhaarNumber('012345678901')).toBe(false);
  });

  it('parses PAN from typical OCR output', () => {
    const text = `
      INCOME TAX DEPARTMENT
      GOVT. OF INDIA
      Permanent Account Number Card
      Name
      RAHUL SHARMA
      Father's Name
      MOHAN SHARMA
      06/06/1988
      ABCDE1234F
    `;
    const parsed = parsePanFromText(text);
    expect(parsed?.panNumber).toBe('ABCDE1234F');
    expect(parsed?.fullName).toBe('Rahul Sharma');
    expect(parsed?.fathersName).toBe('Mohan Sharma');
    expect(parsed?.dateOfBirth).toBe('1988-06-06');
    expect(parsed?.confidence).toBeGreaterThan(0.8);
  });

  it('fixes common PAN OCR mistakes in digit slots', () => {
    const parsed = parsePanFromText('Name RAHUL SHARMA ABCDEI234F');
    expect(parsed?.panNumber).toBe('ABCDE1234F');
  });

  it('parses Aadhaar from spaced number and DOB label', () => {
    const text = `
      GOVERNMENT OF INDIA
      RAHUL SHARMA
      DOB: 15/08/1990
      Male
      2345 6789 0121
    `;
    const parsed = parseAadhaarFromText(text);
    expect(parsed?.aadhaarNumber).toBe('234567890121');
    expect(parsed?.fullName).toBe('Rahul Sharma');
    expect(parsed?.dateOfBirth).toBe('1990-08-15');
    expect(parsed?.confidence).toBeGreaterThan(0.8);
  });

  it('extracts father name from S/O line on Aadhaar back', () => {
    const text = `
      Address line
      S/O Mohan Sharma
      234567890121
    `;
    const parsed = parseAadhaarFromText(text);
    expect(parsed?.aadhaarNumber).toBe('234567890121');
    expect(parsed?.fathersName).toBe('Mohan Sharma');
  });

  it('normalizes noisy OCR characters', () => {
    expect(normalizeOcrText('RAHUL  |  SHARMA')).toContain('RAHUL I SHARMA');
  });

  it('returns null when no valid identifier found', () => {
    expect(parsePanFromText('random receipt text')).toBeNull();
    expect(parseAadhaarFromText('random receipt text')).toBeNull();
  });
});
