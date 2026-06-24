import { describe, expect, it } from 'vitest';
import {
  initialDocTypeFromUploadParams,
  initialMemberIdFromUploadParams,
  uploadPathWithCamera,
} from './uploadNavigation';

describe('uploadNavigation', () => {
  it('adds camera source query param', () => {
    expect(uploadPathWithCamera('/upload')).toBe('/upload?source=camera');
    expect(uploadPathWithCamera('/upload?member=abc')).toBe('/upload?member=abc&source=camera');
  });

  it('derives initial doc type from upload params', () => {
    expect(initialDocTypeFromUploadParams(new URLSearchParams('type=purchase'))).toBe('purchase_receipt');
    expect(initialDocTypeFromUploadParams(new URLSearchParams('context=health'))).toBe('health_insurance');
    expect(initialDocTypeFromUploadParams(new URLSearchParams(''))).toBe('');
  });

  it('derives initial member from query or owner fallback', () => {
    const members = [
      { id: 'owner-1', role: 'owner' },
      { id: 'child-1', role: 'member' },
    ];
    expect(initialMemberIdFromUploadParams(new URLSearchParams('member=child-1'), members)).toBe('child-1');
    expect(initialMemberIdFromUploadParams(new URLSearchParams(''), members)).toBe('owner-1');
  });
});
