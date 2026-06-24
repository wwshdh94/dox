import { describe, expect, it } from 'vitest';
import {
  inferDocTypeFromFields,
  isOcrRecognitionSuccessful,
  resolveDocTypeAfterOcr,
} from '@/lib/ocrRecognition';

describe('ocrRecognition', () => {
  it('infers PAN from fields', () => {
    expect(inferDocTypeFromFields({ panNumber: 'ABCDE1234F' })).toBe('pan');
  });

  it('marks weak OCR as unrecognized', () => {
    expect(
      isOcrRecognitionSuccessful({
        confidence: 0.2,
        fields: {},
        rawText: 'noise',
      }),
    ).toBe(false);
  });

  it('resolves to blank selection when OCR cannot classify', () => {
    const resolved = resolveDocTypeAfterOcr(
      'other',
      false,
      {
        confidence: 0.2,
        fields: {},
        rawText: 'unreadable',
      },
    );
    expect(resolved.needsDocTypeSelection).toBe(true);
    expect(resolved.docType).toBe('other');
    expect(resolved.fields).toEqual({});
  });

  it('keeps user-picked type when OCR extracted something', () => {
    const resolved = resolveDocTypeAfterOcr(
      'passport',
      true,
      {
        confidence: 0.7,
        fields: { fullName: 'Rahul Sharma' },
        rawText: 'REPUBLIC OF INDIA',
      },
    );
    expect(resolved.needsDocTypeSelection).toBe(false);
    expect(resolved.docType).toBe('passport');
  });

  it('prefers user-picked type over inferred type', () => {
    const resolved = resolveDocTypeAfterOcr(
      'passport',
      true,
      {
        confidence: 0.85,
        fields: { panNumber: 'ABCPP1234F', fullName: 'Test' },
        rawText: 'INCOME TAX',
      },
    );
    expect(resolved.docType).toBe('passport');
    expect(resolved.needsDocTypeSelection).toBe(false);
  });

  it('infers type when user left blank', () => {
    const resolved = resolveDocTypeAfterOcr(
      'other',
      false,
      {
        confidence: 0.8,
        fields: { panNumber: 'ABCDE1234F', fullName: 'Test' },
        rawText: 'INCOME TAX',
      },
    );
    expect(resolved.docType).toBe('pan');
    expect(resolved.needsDocTypeSelection).toBe(false);
  });
});
