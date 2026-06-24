export type Point = { x: number; y: number };

export type QuadCorners = {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
};

export type ImageEditSettings = {
  corners: QuadCorners;
  brightness: number;
  contrast: number;
  saturation: number;
  hdr: boolean;
};

export const DEFAULT_CORNERS: QuadCorners = {
  tl: { x: 0, y: 0 },
  tr: { x: 1, y: 0 },
  br: { x: 1, y: 1 },
  bl: { x: 0, y: 1 },
};

export const DEFAULT_IMAGE_EDIT_SETTINGS: ImageEditSettings = {
  corners: DEFAULT_CORNERS,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hdr: false,
};

export function isEditableCameraImage(file: File): boolean {
  return file.type.startsWith('image/');
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

/** Revoke blob URL created by loadImageFromFile when the image is no longer needed. */
export function releaseLoadedImage(image: HTMLImageElement): void {
  if (image.src.startsWith('blob:')) URL.revokeObjectURL(image.src);
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function outputSizeForCorners(corners: QuadCorners, width: number, height: number): {
  width: number;
  height: number;
} {
  const tl = { x: corners.tl.x * width, y: corners.tl.y * height };
  const tr = { x: corners.tr.x * width, y: corners.tr.y * height };
  const br = { x: corners.br.x * width, y: corners.br.y * height };
  const bl = { x: corners.bl.x * width, y: corners.bl.y * height };
  const outW = Math.max(1, Math.round(Math.max(dist(tl, tr), dist(bl, br))));
  const outH = Math.max(1, Math.round(Math.max(dist(tl, bl), dist(tr, br))));
  return { width: outW, height: outH };
}

/** Map (x, y, w, h) rectangle corners to quad corners in source image space. */
function homographyFromRectToQuad(
  w: number,
  h: number,
  tl: Point,
  tr: Point,
  br: Point,
  bl: Point,
): number[] {
  const x0 = 0;
  const y0 = 0;
  const x1 = w;
  const y1 = 0;
  const x2 = w;
  const y2 = h;
  const x3 = 0;
  const y3 = h;

  const src = [x0, y0, x1, y1, x2, y2, x3, y3];
  const dst = [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const xs = src[i * 2];
    const ys = src[i * 2 + 1];
    const xd = dst[i * 2];
    const yd = dst[i * 2 + 1];
    A.push([xs, ys, 1, 0, 0, 0, -xd * xs, -xd * ys]);
    b.push(xd);
    A.push([0, 0, 0, xs, ys, 1, -yd * xs, -yd * ys]);
    b.push(yd);
  }

  const hMat = solveLinearSystem8(A, b);
  hMat.push(1);
  return hMat;
}

function solveLinearSystem8(A: number[][], b: number[]): number[] {
  const n = 8;
  const m = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];

    const div = m[col][col] || 1e-8;
    for (let j = col; j <= n; j += 1) m[col][j] /= div;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row][col];
      for (let j = col; j <= n; j += 1) m[row][j] -= factor * m[col][j];
    }
  }

  return m.map((row) => row[n]);
}

function applyHomography(H: number[], x: number, y: number): Point {
  const denom = H[6] * x + H[7] * y + H[8];
  return {
    x: (H[0] * x + H[1] * y + H[2]) / denom,
    y: (H[3] * x + H[4] * y + H[5]) / denom,
  };
}

function sampleBilinear(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): [number, number, number, number] {
  const cx = Math.max(0, Math.min(width - 1, x));
  const cy = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = cx - x0;
  const ty = cy - y0;

  const i = (y0 * width + x0) * 4;
  const i2 = (y0 * width + x1) * 4;
  const i3 = (y1 * width + x0) * 4;
  const i4 = (y1 * width + x1) * 4;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const r =
    lerp(lerp(data[i], data[i2], tx), lerp(data[i3], data[i4], tx), ty);
  const g =
    lerp(lerp(data[i + 1], data[i2 + 1], tx), lerp(data[i3 + 1], data[i4 + 1], tx), ty);
  const b =
    lerp(lerp(data[i + 2], data[i2 + 2], tx), lerp(data[i3 + 2], data[i4 + 2], tx), ty);
  const a =
    lerp(lerp(data[i + 3], data[i2 + 3], tx), lerp(data[i3 + 3], data[i4 + 3], tx), ty);
  return [r, g, b, a];
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function applyToneAdjustments(
  r: number,
  g: number,
  b: number,
  settings: ImageEditSettings,
): [number, number, number] {
  let brightness = settings.brightness;
  let contrast = settings.contrast;
  let saturation = settings.saturation;

  if (settings.hdr) {
    brightness *= 1.06;
    contrast *= 1.18;
    saturation *= 1.12;
  }

  let rr = (r - 128) * contrast + 128;
  let gg = (g - 128) * contrast + 128;
  let bb = (b - 128) * contrast + 128;

  rr *= brightness;
  gg *= brightness;
  bb *= brightness;

  if (settings.hdr) {
    const gamma = 0.9;
    rr = 255 * (rr / 255) ** gamma;
    gg = 255 * (gg / 255) ** gamma;
    bb = 255 * (bb / 255) ** gamma;
  }

  const gray = 0.299 * rr + 0.587 * gg + 0.114 * bb;
  rr = gray + (rr - gray) * saturation;
  gg = gray + (gg - gray) * saturation;
  bb = gray + (bb - gray) * saturation;

  return [clampByte(rr), clampByte(gg), clampByte(bb)];
}

export function cssFilterForSettings(settings: ImageEditSettings): string {
  let brightness = settings.brightness;
  let contrast = settings.contrast;
  let saturation = settings.saturation;
  if (settings.hdr) {
    brightness *= 1.06;
    contrast *= 1.18;
    saturation *= 1.12;
  }
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
}

export async function renderEditedImage(
  image: HTMLImageElement,
  settings: ImageEditSettings,
): Promise<HTMLCanvasElement> {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = image.naturalWidth;
  srcCanvas.height = image.naturalHeight;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Canvas unavailable');
  srcCtx.drawImage(image, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const tl = { x: settings.corners.tl.x * w, y: settings.corners.tl.y * h };
  const tr = { x: settings.corners.tr.x * w, y: settings.corners.tr.y * h };
  const br = { x: settings.corners.br.x * w, y: settings.corners.br.y * h };
  const bl = { x: settings.corners.bl.x * w, y: settings.corners.bl.y * h };

  const { width: outW, height: outH } = outputSizeForCorners(settings.corners, w, h);
  const H = homographyFromRectToQuad(outW, outH, tl, tr, br, bl);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outData = outCtxImageData(outCanvas, outW, outH);

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const src = applyHomography(H, x, y);
      const [r, g, b, a] = sampleBilinear(srcData.data, w, h, src.x, src.y);
      const [rr, gg, bb] = applyToneAdjustments(r, g, b, settings);
      const idx = (y * outW + x) * 4;
      outData.data[idx] = rr;
      outData.data[idx + 1] = gg;
      outData.data[idx + 2] = bb;
      outData.data[idx + 3] = a;
    }
  }

  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Canvas unavailable');
  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}

function outCtxImageData(canvas: HTMLCanvasElement, w: number, h: number): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  return ctx.createImageData(w, h);
}

export async function exportEditedImageFile(
  image: HTMLImageElement,
  settings: ImageEditSettings,
  fileName: string,
): Promise<File> {
  const canvas = await renderEditedImage(image, settings);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not export image'))),
      'image/jpeg',
      0.92,
    );
  });
  const safeName = fileName.replace(/\.[^.]+$/, '') || 'scan';
  return new File([blob], `${safeName}-edited.jpg`, { type: 'image/jpeg' });
}

export type CornerKey = keyof QuadCorners;

export function clampCorner(point: Point): Point {
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y)),
  };
}
