import { describe, expect, it } from 'vitest';
import { extractOnDevice, findDuplicate } from './ocr';
import type { Document } from '@/types';

describe('ocr', () => {
  it('finds duplicate by reg number', () => {
    const docs: Document[] = [
      {
        id: '1',
        title: 'RC',
        docType: 'vehicle_rc',
        fields: { registrationNumber: 'MH01AB1234' },
        createdAt: '',
        updatedAt: '',
      },
    ];
    const dup = findDuplicate(docs, 'vehicle_rc', { registrationNumber: 'MH01AB1234' });
    expect(dup?.id).toBe('1');
  });

  it('finds duplicate by PAN number', () => {
    const docs: Document[] = [
      {
        id: '2',
        title: 'PAN',
        docType: 'pan',
        fields: { panNumber: 'ABCPP1234F', fullName: 'Rahul' },
        createdAt: '',
        updatedAt: '',
      },
    ];
    const dup = findDuplicate(docs, 'pan', { panNumber: 'ABCPP1234F' });
    expect(dup?.id).toBe('2');
  });

  it('extracts PAN fields from OCR text without image', async () => {
    const result = await extractOnDevice({
      fileName: 'pan.jpg',
      docType: 'pan',
      ocrText: `
        INCOME TAX DEPARTMENT
        Name
        RAHUL SHARMA
        ABCPP1234F
      `,
    });
    expect(result.fields.panNumber).toBe('ABCPP1234F');
    expect(result.fields.fullName).toBe('Rahul Sharma');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('extracts Aadhaar fields from OCR text without image', async () => {
    const result = await extractOnDevice({
      fileName: 'aadhaar.jpg',
      docType: 'aadhaar',
      ocrText: `
        GOVERNMENT OF INDIA
        PRIYA PATEL
        DOB: 02/03/1992
        2345 6789 0121
      `,
    });
    expect(result.fields.aadhaarNumber).toBe('234567890121');
    expect(result.fields.fullName).toBe('Priya Patel');
    expect(result.fields.dateOfBirth).toBe('1992-03-02');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
