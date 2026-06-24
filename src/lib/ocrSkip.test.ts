import { describe, expect, it } from 'vitest';
import { looksHandwritten, shouldSkipCloudOcr } from '@/lib/ocrSkip';

describe('ocrSkip', () => {
  it('skips very long OCR text', () => {
    expect(shouldSkipCloudOcr('x'.repeat(2500))).toBe(true);
  });

  it('skips many lines', () => {
    const text = Array.from({ length: 60 }, (_, i) => `Line ${i} content here`).join('\n');
    expect(shouldSkipCloudOcr(text)).toBe(true);
  });

  it('detects noisy handwritten-like OCR', () => {
    const text = 'a b c d e f g h i j k l m n o p q r s t u v w x y z '.repeat(5);
    expect(looksHandwritten(text)).toBe(true);
  });

  it('allows normal ID card text', () => {
    const text = 'INCOME TAX DEPARTMENT GOVT OF INDIA PAN ABCDE1234F NAME RAHUL SHARMA';
    expect(shouldSkipCloudOcr(text)).toBe(false);
  });
});
