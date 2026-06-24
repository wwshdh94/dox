/** On-device OCR via PaddleOCR.js (PP-OCRv5) with lazy init. */

type PaddleOcrInstance = Awaited<
  ReturnType<typeof import('@paddleocr/paddleocr-js').PaddleOCR.create>
>;

let paddlePromise: Promise<PaddleOcrInstance | null> | null = null;
let paddleUnavailable = false;

async function getPaddleOcr(): Promise<PaddleOcrInstance | null> {
  if (paddleUnavailable) return null;
  if (typeof window === 'undefined' || import.meta.env.VITEST) return null;

  if (!paddlePromise) {
    paddlePromise = (async () => {
      try {
        const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
        const ocr = await PaddleOCR.create({
          lang: 'ch',
          ocrVersion: 'PP-OCRv5',
          worker: true,
          ortOptions: {
            backend: 'wasm',
            wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/',
            numThreads: 1,
            simd: true,
          },
        });
        return ocr;
      } catch {
        paddleUnavailable = true;
        return null;
      }
    })();
  }
  return paddlePromise;
}

export async function recognizeWithPaddle(
  imageSource: CanvasImageSource | string,
): Promise<{ text: string; confidence: number } | null> {
  const ocr = await getPaddleOcr();
  if (!ocr) return null;

  try {
    const results = await ocr.predict(imageSource);
    const items = results[0]?.items ?? [];
    if (items.length === 0) return null;

    const lines = items
      .slice()
      .sort((a, b) => {
        const ay = a.poly[0]?.[1] ?? 0;
        const by = b.poly[0]?.[1] ?? 0;
        if (Math.abs(ay - by) > 12) return ay - by;
        return (a.poly[0]?.[0] ?? 0) - (b.poly[0]?.[0] ?? 0);
      })
      .map((item) => item.text.trim())
      .filter(Boolean);

    const text = lines.join('\n');
    const scores = items.map((i) => i.score).filter((s) => s > 0);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;

    return { text, confidence: Math.min(Math.max(avgScore, 0), 1) };
  } catch {
    return null;
  }
}

/** Test-only reset. */
export function __resetPaddleOcrForTests(): void {
  paddlePromise = null;
  paddleUnavailable = false;
}
