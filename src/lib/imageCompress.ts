/** Vault scan compression — printable quality, smaller files. */

import { MAX_UPLOAD_IMAGE_BYTES } from '@/lib/inputLimits';

export const VAULT_IMAGE_MAX_EDGE = 2400;
export const VAULT_JPEG_QUALITY = 0.84;
export const VAULT_MAX_BYTES = 1_200_000;

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = dataUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))),
      'image/jpeg',
      quality,
    );
  });
}

function drawScaledImage(
  img: HTMLImageElement,
  maxEdge: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, width, height };
}

function safeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'scan';
  return `${base}.jpg`;
}

export async function compressImageFromCanvas(
  canvas: HTMLCanvasElement,
  fileName: string,
  options?: { maxBytes?: number; quality?: number },
): Promise<File> {
  const maxBytes = options?.maxBytes ?? VAULT_MAX_BYTES;
  let quality = options?.quality ?? VAULT_JPEG_QUALITY;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const blob = await canvasToJpegBlob(canvas, quality);
    if (blob.size <= maxBytes || quality <= 0.58) {
      return new File([blob], safeFileName(fileName), { type: 'image/jpeg' });
    }
    quality -= 0.06;
  }

  const blob = await canvasToJpegBlob(canvas, 0.58);
  return new File([blob], safeFileName(fileName), { type: 'image/jpeg' });
}

export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; maxBytes?: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error('image_too_large');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });

  const img = await loadImageFromDataUrl(dataUrl);
  const maxEdge = options?.maxEdge ?? VAULT_IMAGE_MAX_EDGE;
  const { canvas } = drawScaledImage(img, maxEdge);
  return compressImageFromCanvas(canvas, file.name, options);
}

export async function compressDataUrl(
  dataUrl: string,
  fileName: string,
  options?: { maxEdge?: number; maxBytes?: number; quality?: number },
): Promise<{ file: File; dataUrl: string }> {
  const img = await loadImageFromDataUrl(dataUrl);
  const maxEdge = options?.maxEdge ?? VAULT_IMAGE_MAX_EDGE;
  const { canvas } = drawScaledImage(img, maxEdge);
  const file = await compressImageFromCanvas(canvas, fileName, options);
  const outUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read compressed image'));
    reader.readAsDataURL(file);
  });
  return { file, dataUrl: outUrl };
}
