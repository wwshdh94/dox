import { describe, expect, it } from 'vitest';
import { isImageFile, isPdfFile } from './files';

describe('files', () => {
  it('detects pdf', () => {
    expect(isPdfFile('passport.pdf')).toBe(true);
    expect(isPdfFile('photo.jpg')).toBe(false);
    expect(isPdfFile(undefined, 'data:application/pdf;base64,abc')).toBe(true);
  });

  it('detects images', () => {
    expect(isImageFile('scan.jpg')).toBe(true);
    expect(isImageFile('doc.pdf')).toBe(false);
    expect(isImageFile(undefined, 'data:image/png;base64,abc')).toBe(true);
  });
});
