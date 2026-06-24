import { describe, expect, it } from 'vitest';
import { isDocumentProcessingEnabled } from '@/lib/documentProcessing';

describe('documentProcessing', () => {
  it('defaults to enabled when unset', () => {
    expect(isDocumentProcessingEnabled({})).toBe(true);
  });

  it('respects explicit false', () => {
    expect(isDocumentProcessingEnabled({ documentProcessingEnabled: false })).toBe(false);
  });
});
