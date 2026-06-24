/** On-device image OCR — doc-type ROI crops + PaddleOCR + Tesseract fallback. */

import type { DocType } from '@/types';
import {
  adjustRegionsForOrientation,
  cropImageRegion,
  expandRegionRect,
  formatRegionOcrText,
  getOcrRegions,
  tesseractWhitelistForRegion,
  usesRegionOcr,
} from '@/lib/ocrRegions';
import {
  loadImageFromDataUrl,
  preprocessCardImage,
  preprocessCardImageSoft,
  upscaleDataUrlMinWidthAsync,
} from '@/lib/ocrPreprocess';
import { recognizeWithPaddle } from '@/lib/ocrPaddle';

let workerPromise: Promise<import('tesseract.js').Worker> | null = null;

export interface RecognizeImageOptions {
  /** User-selected document type — enables location-specific ROI extraction. */
  docType?: DocType;
  /** Page index for multi-page docs (e.g. Aadhaar front=0, back=1). */
  pageIndex?: number;
}

export interface RecognizeImageResult {
  text: string;
  confidence: number;
  regions?: Record<string, string>;
}

async function getTesseractWorker(): Promise<import('tesseract.js').Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng+hin', 1, {
        logger: () => {
          /* never log OCR output — may contain PII */
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function recognizeWithTesseract(
  dataUrl: string,
  img: HTMLImageElement,
  opts?: {
    mode?: 'line' | 'block';
    whitelist?: string;
    binarize?: boolean;
  },
): Promise<{ text: string; confidence: number }> {
  const preprocessed = opts?.binarize
    ? preprocessCardImage(img, img.naturalWidth, img.naturalHeight, { binarize: true })
    : preprocessCardImageSoft(img, img.naturalWidth, img.naturalHeight);

  const worker = await getTesseractWorker();
  const { PSM } = await import('tesseract.js');

  const params: Record<string, string | number> = {
    preserve_interword_spaces: '1',
  };
  if (opts?.mode) {
    params.tessedit_pageseg_mode = opts.mode === 'line' ? PSM.SINGLE_LINE : PSM.SINGLE_BLOCK;
  }
  if (opts?.whitelist) {
    params.tessedit_char_whitelist = opts.whitelist;
  }
  await worker.setParameters(params);

  const { data } = await worker.recognize(preprocessed || dataUrl);

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    tessedit_char_whitelist: '',
    preserve_interword_spaces: '1',
  });

  const text = data.text?.trim() ?? '';
  const confidence = typeof data.confidence === 'number' ? data.confidence / 100 : 0.5;
  return { text, confidence: Math.min(Math.max(confidence, 0), 1) };
}

async function recognizeFullPage(
  dataUrl: string,
  img: HTMLImageElement,
): Promise<{ text: string; confidence: number }> {
  const softPreprocessed = preprocessCardImageSoft(img, img.naturalWidth, img.naturalHeight);

  const paddle = await recognizeWithPaddle(softPreprocessed || dataUrl);
  if (paddle && paddle.text.length >= 8) {
    return paddle;
  }

  const tesseract = await recognizeWithTesseract(dataUrl, img);
  if (paddle?.text && tesseract.text) {
    return {
      text: `${paddle.text}\n${tesseract.text}`,
      confidence: Math.max(paddle.confidence, tesseract.confidence),
    };
  }

  return tesseract;
}

function cleanRegionText(regionId: string, text: string): string {
  if (regionId === 'mrz') {
    return text
      .toUpperCase()
      .split('\n')
      .map((line) => line.replace(/\s+/g, ''))
      .filter((line) => line.length >= 20)
      .join('\n');
  }
  if (regionId === 'aadhaar_number' || regionId === 'pan_number') {
    return text.replace(/\s+/g, ' ').trim();
  }
  return text.trim();
}

async function recognizeRegions(
  img: HTMLImageElement,
  docType: DocType,
  pageIndex: number,
): Promise<{ regions: Record<string, string>; confidence: number }> {
  const baseDefs = getOcrRegions(docType, pageIndex);
  const defs = adjustRegionsForOrientation(
    baseDefs,
    img.naturalWidth,
    img.naturalHeight,
    docType,
  );

  const regions: Record<string, string> = {};
  let confSum = 0;
  let confCount = 0;

  for (const def of defs) {
    const rect = def.id === 'mrz' ? expandRegionRect(def.rect, 0.015) : def.rect;
    let cropUrl = cropImageRegion(img, img.naturalWidth, img.naturalHeight, rect);
    if (!cropUrl) continue;

    cropUrl = await upscaleDataUrlMinWidthAsync(cropUrl, def.mode === 'line' ? 640 : 480);

    const cropImg = await loadImageFromDataUrl(cropUrl);
    const whitelist = tesseractWhitelistForRegion(def.id);
    const binarize = def.mode === 'line' || def.id === 'mrz';

    const soft = binarize
      ? preprocessCardImage(cropImg, cropImg.naturalWidth, cropImg.naturalHeight, { binarize: true })
      : preprocessCardImageSoft(cropImg, cropImg.naturalWidth, cropImg.naturalHeight);

    const paddle = await recognizeWithPaddle(soft || cropUrl);
    let text = paddle?.text?.trim() ?? '';
    let confidence = paddle?.confidence ?? 0;

    const minLen = def.mode === 'line' ? 3 : 2;
    if (text.length < minLen) {
      const tess = await recognizeWithTesseract(cropUrl, cropImg, {
        mode: def.mode,
        whitelist,
        binarize,
      });
      if (tess.text.length >= text.length) {
        text = tess.text;
        confidence = tess.confidence;
      }
    }

    text = cleanRegionText(def.id, text);
    if (text.length > 0) {
      regions[def.id] = text;
      confSum += confidence;
      confCount++;
    }
  }

  return {
    regions,
    confidence: confCount > 0 ? confSum / confCount : 0,
  };
}

function countFilledRegions(regions: Record<string, string>): number {
  return Object.values(regions).filter((t) => t.trim().length > 0).length;
}

export { preprocessCardImage } from '@/lib/ocrPreprocess';

export async function recognizeImageText(
  dataUrl: string,
  options?: RecognizeImageOptions,
): Promise<RecognizeImageResult> {
  if (!dataUrl.startsWith('data:image/')) {
    return { text: '', confidence: 0 };
  }

  const img = await loadImageFromDataUrl(dataUrl);
  const docType = options?.docType;
  const pageIndex = options?.pageIndex ?? 0;

  if (!docType || !usesRegionOcr(docType)) {
    return recognizeFullPage(dataUrl, img);
  }

  const regional = await recognizeRegions(img, docType, pageIndex);
  const regionText = formatRegionOcrText(regional.regions);
  const filledRegions = countFilledRegions(regional.regions);

  // Strong region reads — skip noisy full-page merge
  if (filledRegions >= 2 && regional.confidence >= 0.45) {
    return {
      text: regionText,
      confidence: regional.confidence,
      regions: regional.regions,
    };
  }

  const full = await recognizeFullPage(dataUrl, img);

  if (filledRegions === 0) {
    return full;
  }

  return {
    text: regionText ? `${regionText}\n\n---\n${full.text}` : full.text,
    confidence: Math.max(full.confidence, regional.confidence),
    regions: regional.regions,
  };
}

/** Test-only reset — avoids worker reuse across Vitest cases. */
export function __resetOcrWorkerForTests(): void {
  workerPromise = null;
}
