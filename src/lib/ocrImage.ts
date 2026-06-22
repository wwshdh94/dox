/** On-device image OCR via Tesseract WASM. */

let workerPromise: Promise<import('tesseract.js').Worker> | null = null;

async function getWorker(): Promise<import('tesseract.js').Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: () => {
          /* never log OCR output — may contain PII */
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Preprocess card image for sharper OCR (grayscale + contrast). */
export function preprocessCardImage(
  source: CanvasImageSource,
  width: number,
  height: number,
): string {
  const targetWidth = Math.max(width, 1400);
  const scale = targetWidth / width;
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = 1.35;
    const adjusted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = dataUrl;
  });
}

export async function recognizeImageText(
  dataUrl: string,
): Promise<{ text: string; confidence: number }> {
  if (!dataUrl.startsWith('data:image/')) {
    return { text: '', confidence: 0 };
  }

  const img = await loadImage(dataUrl);
  const preprocessed = preprocessCardImage(img, img.naturalWidth, img.naturalHeight);

  const worker = await getWorker();
  const { data } = await worker.recognize(preprocessed || dataUrl);

  const text = data.text?.trim() ?? '';
  const confidence = typeof data.confidence === 'number' ? data.confidence / 100 : 0.5;
  return { text, confidence: Math.min(Math.max(confidence, 0), 1) };
}

/** Test-only reset — avoids worker reuse across Vitest cases. */
export function __resetOcrWorkerForTests(): void {
  workerPromise = null;
}
