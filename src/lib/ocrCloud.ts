import type { DocType } from '@/types';

export interface CloudOcrRequest {
  docType: DocType;
  fileName: string;
  fileDataUrl: string;
}

export interface CloudOcrResponse {
  ocrText: string;
  confidence: number;
  fields?: Record<string, string>;
  source: 'openai' | 'google_vision';
}

const OCR_TIMEOUT_MS = 120_000;

/** Cloud OCR endpoint — dev uses Vite middleware unless overridden. */
export function cloudOcrEndpoint(): string {
  const fromEnv = import.meta.env.VITE_OCR_API_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, '');
  if (import.meta.env.DEV) return '/api/ocr/extract';
  return '';
}

export function isCloudOcrConfigured(): boolean {
  return cloudOcrEndpoint().length > 0;
}

/** User opted in + plan/dev allows cloud extraction. */
export function isCloudOcrAllowed(
  settings: { cloudAiEnabled: boolean },
  isPro: boolean,
): boolean {
  if (!isCloudOcrConfigured()) return false;
  if (!settings.cloudAiEnabled && !import.meta.env.DEV) return false;
  return isPro || import.meta.env.DEV;
}

export async function extractCloudOcr(opts: CloudOcrRequest): Promise<CloudOcrResponse> {
  const endpoint = cloudOcrEndpoint();
  if (!endpoint) {
    throw new Error('cloud_ocr_not_configured');
  }
  if (!opts.fileDataUrl.startsWith('data:image/')) {
    throw new Error('cloud_ocr_requires_image');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: opts.docType,
        fileName: opts.fileName,
        image: opts.fileDataUrl,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as CloudOcrResponse & { error?: string; message?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? `cloud_ocr_http_${response.status}`);
    }

    return {
      ocrText: payload.ocrText ?? '',
      confidence: typeof payload.confidence === 'number' ? payload.confidence : 0.75,
      fields: payload.fields,
      source: payload.source ?? 'openai',
    };
  } finally {
    window.clearTimeout(timer);
  }
}
