import { describe, expect, it } from 'vitest';
import { VAULT_IMAGE_MAX_EDGE, VAULT_JPEG_QUALITY, VAULT_MAX_BYTES } from '@/lib/imageCompress';

describe('imageCompress constants', () => {
  it('targets printable quality at reasonable size', () => {
    expect(VAULT_IMAGE_MAX_EDGE).toBeGreaterThanOrEqual(2000);
    expect(VAULT_JPEG_QUALITY).toBeGreaterThan(0.7);
    expect(VAULT_MAX_BYTES).toBeLessThanOrEqual(2_000_000);
  });
});
