import { describe, expect, it } from 'vitest';
import {
  chooseInitialExtractMode,
  shouldEscalateToCloud,
  shouldExtractFromUpload,
} from '@/lib/ocrRoute';

describe('ocrRoute', () => {
  it('detects image uploads', () => {
    expect(shouldExtractFromUpload({ fileDataUrl: 'data:image/jpeg;base64,abc' })).toBe(true);
    expect(shouldExtractFromUpload({ fileDataUrl: 'data:application/pdf;base64,abc' })).toBe(false);
  });

  it('prefers on-device for PAN', () => {
    expect(
      chooseInitialExtractMode({ docType: 'pan', cloudAllowed: true, hasImage: true }),
    ).toBe('on_device');
  });

  it('prefers cloud for RC when allowed', () => {
    expect(
      chooseInitialExtractMode({ docType: 'vehicle_rc', cloudAllowed: true, hasImage: true }),
    ).toBe('cloud');
  });

  it('escalates low-confidence PAN to cloud', () => {
    expect(
      shouldEscalateToCloud({
        docType: 'pan',
        confidence: 0.4,
        filledFields: 0,
        cloudAllowed: true,
        alreadyCloud: false,
      }),
    ).toBe(true);
  });
});
