/** Heuristics to skip cloud AI on long or handwritten documents. */

const MAX_CLOUD_OCR_CHARS = 2200;
const MAX_CLOUD_OCR_LINES = 55;

export function looksHandwritten(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 15) return false;

  const shortRatio = words.filter((w) => w.length <= 2).length / words.length;
  if (shortRatio > 0.38) return true;

  const noisy = (text.match(/[^a-zA-Z0-9\s.,/\-():@#%+]/g) ?? []).length;
  return noisy / Math.max(text.length, 1) > 0.08;
}

export function shouldSkipCloudOcr(rawText: string): boolean {
  const text = rawText.trim();
  if (!text) return false;
  if (text.length > MAX_CLOUD_OCR_CHARS) return true;

  const lines = text.split(/\n/).filter((line) => line.trim().length > 0);
  if (lines.length > MAX_CLOUD_OCR_LINES) return true;

  return looksHandwritten(text);
}
