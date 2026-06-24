import { describe, expect, it } from 'vitest';
import {
  isValidAadhaarNumber,
  isValidPanNumber,
  normalizeOcrText,
  parseAadhaarFromRegions,
  parseAadhaarFromText,
  parsePanFromRegions,
  parsePanFromText,
  parsePassportFromRegions,
  parseDrivingLicenseFromText,
  parsePassportMrzFromText,
} from './idDocParser';

describe('idDocParser', () => {
  it('validates PAN entity type letter', () => {
    expect(isValidPanNumber('ABCDE1234F')).toBe(false);
    expect(isValidPanNumber('ABCPP1234F')).toBe(true);
  });

  it('rejects PAN with invalid entity type via parser', () => {
    expect(parsePanFromText('ABCDE1234F')).toBeNull();
  });

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
      ABCPP1234F
    `;
    const parsed = parsePanFromText(text);
    expect(parsed?.panNumber).toBe('ABCPP1234F');
    expect(parsed?.fullName).toBe('Rahul Sharma');
    expect(parsed?.fathersName).toBe('Mohan Sharma');
    expect(parsed?.dateOfBirth).toBe('1988-06-06');
    expect(parsed?.confidence).toBeGreaterThan(0.8);
  });

  it('fixes common PAN OCR mistakes in digit slots', () => {
    const parsed = parsePanFromText('Name RAHUL SHARMA ABCPPI234F');
    expect(parsed?.panNumber).toBe('ABCPP1234F');
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

  it('parses passport MRZ lines', () => {
    const text = `
      P<INDSHARMA<<RAHUL<KUMAR<<<<<<<<<<<<<<<<<<<
      Z1234567<3IND9008154M2508154<<<<<<<<<<<<<<04
    `;
    const parsed = parsePassportMrzFromText(text);
    expect(parsed?.passportNumber).toBe('Z1234567');
    expect(parsed?.fullName).toContain('Rahul');
    expect(parsed?.dateOfBirth).toBe('1990-08-15');
    expect(parsed?.expiryDate).toBe('2025-08-15');
    expect(parsed?.confidence).toBeGreaterThan(0.8);
  });

  it('parses driving license number from OCR text', () => {
    const text = `
      UNION OF INDIA
      Driving Licence
      Name
      RAHUL SHARMA
      MH01-2019-0012345
      DOB: 15/08/1990
      Validity: 15/08/2030
    `;
    const parsed = parseDrivingLicenseFromText(text);
    expect(parsed?.licenseNumber).toMatch(/^MH01/);
    expect(parsed?.fullName).toBe('Rahul Sharma');
    expect(parsed?.dateOfBirth).toBe('1990-08-15');
    expect(parsed?.expiryDate).toBe('2030-08-15');
  });

  it('parses PAN from location-specific region crops', () => {
    const parsed = parsePanFromRegions({
      name: 'RAHUL SHARMA',
      father_name: 'MOHAN SHARMA',
      dob: '06/06/1988',
      pan_number: 'ABCPP1234F',
    });
    expect(parsed?.panNumber).toBe('ABCPP1234F');
    expect(parsed?.fullName).toBe('Rahul Sharma');
    expect(parsed?.fathersName).toBe('Mohan Sharma');
  });

  it('parses Aadhaar front regions separately from back', () => {
    const front = parseAadhaarFromRegions(
      {
        name: 'PRIYA PATEL',
        dob: '02/03/1992',
        aadhaar_number: '2345 6789 0121',
      },
      0,
    );
    expect(front?.fullName).toBe('Priya Patel');
    expect(front?.aadhaarNumber).toBe('234567890121');

    const back = parseAadhaarFromRegions(
      {
        address: '12 MG Road Bangalore',
        father_name: 'S/O Rajesh Patel',
        aadhaar_number: '2345 6789 0121',
      },
      1,
    );
    expect(back?.fathersName).toBe('Rajesh Patel');
  });

  it('parses passport MRZ from cropped region text', () => {
    const parsed = parsePassportFromRegions({
      mrz: `P<INDSHARMA<<RAHUL<KUMAR<<<<<<<<<<<<<<<<<<<
Z1234567<3IND9008154M2508154<<<<<<<<<<<<<<04`,
    });
    expect(parsed?.passportNumber).toBe('Z1234567');
    expect(parsed?.dateOfBirth).toBe('1990-08-15');
  });
});
