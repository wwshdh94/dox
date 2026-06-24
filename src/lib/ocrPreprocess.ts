/** Image preprocessing for Indian ID card OCR (grayscale, denoise, adaptive threshold). */

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = dataUrl;
  });
}

function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/** 3×3 box blur — light denoise before thresholding. */
function boxBlur3x3(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += gray[ny * width + nx];
            count++;
          }
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

/** Local adaptive threshold (Sauvola-lite) for uneven lighting on card photos. */
function adaptiveThreshold(
  gray: Float32Array,
  width: number,
  height: number,
  window = 15,
  k = 0.15,
): Uint8ClampedArray {
  const half = Math.floor(window / 2);
  const out = new Uint8ClampedArray(gray.length);
  const globalMean = gray.reduce((a, b) => a + b, 0) / gray.length;
  const R = 128;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += gray[ny * width + nx];
            count++;
          }
        }
      }
      const localMean = sum / count;
      const threshold = localMean * (1 + k * ((localMean - globalMean) / R - 1));
      out[y * width + x] = gray[y * width + x] > threshold ? 255 : 0;
    }
  }
  return out;
}

function applyContrast(gray: Float32Array, factor: number): void {
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.min(255, Math.max(0, (gray[i] - 128) * factor + 128));
  }
}

/** Preprocess card image: upscale, denoise, contrast, adaptive binarization. */
export function preprocessCardImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  options?: { binarize?: boolean },
): string {
  const targetWidth = Math.max(width, 1600);
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

  let gray = toGrayscale(data);
  gray = boxBlur3x3(gray, targetWidth, targetHeight);
  applyContrast(gray, 1.4);

  if (options?.binarize !== false) {
    const binary = adaptiveThreshold(gray, targetWidth, targetHeight);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const v = binary[j];
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
  } else {
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const v = Math.round(gray[j]);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Grayscale + contrast only — better for PaddleOCR colour models. */
export function preprocessCardImageSoft(
  source: CanvasImageSource,
  width: number,
  height: number,
): string {
  return preprocessCardImage(source, width, height, { binarize: false });
}

/** Draw image to canvas and return ImageData for QR scanning. */
export function imageDataFromSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export { cropImageRegion, type NormalizedRect } from '@/lib/ocrRegions';

/** Upscale a crop so OCR engines have enough pixels (min width). */
export async function upscaleDataUrlMinWidthAsync(
  dataUrl: string,
  minWidth = 520,
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  const img = await loadImageFromDataUrl(dataUrl);
  if (img.naturalWidth >= minWidth) return dataUrl;

  const scale = minWidth / img.naturalWidth;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}
