import { describe, expect, it, vi, afterEach } from 'vitest';
import { cloudOcrEndpoint, extractCloudOcr } from './ocrCloud';

describe('ocrCloud', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses dev API path when unset', () => {
    expect(cloudOcrEndpoint()).toBe('/api/ocr/extract');
  });

  it('parses cloud OCR response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ocrText: 'ABCDE1234F',
          confidence: 0.9,
          fields: { panNumber: 'ABCDE1234F', fullName: 'Rahul Sharma' },
          source: 'openai',
        }),
      }),
    );

    const result = await extractCloudOcr({
      docType: 'pan',
      fileName: 'pan.jpg',
      fileDataUrl: 'data:image/jpeg;base64,abc',
    });

    expect(result.fields?.panNumber).toBe('ABCDE1234F');
    expect(result.confidence).toBe(0.9);
  });
});
