import type { IncomingMessage, ServerResponse } from 'node:http';

export interface OcrExtractRequest {
  docType: string;
  image: string;
  fileName?: string;
}

export interface OcrExtractResponse {
  ocrText: string;
  confidence: number;
  fields?: Record<string, string>;
  source: 'openai' | 'google_vision';
}

const MAX_BODY_BYTES = 14 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 115_000;

const ID_DOC_TYPES = new Set(['pan', 'aadhaar', 'passport', 'driving_license', 'voter_id']);

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function extractionPrompt(docType: string): string {
  switch (docType) {
    case 'pan':
      return `Extract fields from this Indian PAN card image. Return JSON:
{"ocrText":"full visible text","panNumber":"AAAAA9999A","fullName":"","fathersName":"","dateOfBirth":"YYYY-MM-DD or empty"}`;
    case 'aadhaar':
      return `Extract fields from this Indian Aadhaar card image. Return JSON:
{"ocrText":"full visible text","aadhaarNumber":"12 digits no spaces","fullName":"","dateOfBirth":"YYYY-MM-DD or empty","fathersName":""}`;
    case 'passport':
      return `Extract fields from this Indian passport image. Return JSON:
{"ocrText":"full visible text","passportNumber":"","fullName":"","dateOfBirth":"YYYY-MM-DD or empty","dateOfIssue":"YYYY-MM-DD or empty","expiryDate":"YYYY-MM-DD or empty"}`;
    case 'driving_license':
      return `Extract fields from this Indian driving licence image. Return JSON:
{"ocrText":"full visible text","licenseNumber":"","fullName":"","dateOfBirth":"YYYY-MM-DD or empty","expiryDate":"YYYY-MM-DD or empty"}`;
    case 'voter_id':
      return `Extract fields from this Indian Voter ID / EPIC card image. Return JSON:
{"ocrText":"full visible text","voterIdNumber":"","fullName":""}`;
    default:
      return `Read all text from this document image (${docType}). Return JSON:
{"ocrText":"full visible text"}`;
  }
}

async function extractWithOpenAI(docType: string, image: string): Promise<OcrExtractResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('openai_not_configured');

  const model = process.env.OPENAI_OCR_MODEL ?? 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract structured data from Indian identity and government documents. Return valid JSON only. Do not guess — use empty strings when unreadable. Aadhaar: 12 digits, Verhoeff-valid when possible. PAN: AAAAA9999A format.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: extractionPrompt(docType) },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 1200,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`openai_http_${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('openai_empty_response');

  const parsed = JSON.parse(content) as Record<string, string>;
  const ocrText = String(parsed.ocrText ?? '').trim();
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'ocrText') continue;
    if (typeof value === 'string' && value.trim()) fields[key] = value.trim();
  }

  return {
    ocrText,
    confidence: Object.keys(fields).length > 0 ? 0.92 : ocrText ? 0.8 : 0.4,
    fields: Object.keys(fields).length > 0 ? fields : undefined,
    source: 'openai',
  };
}

async function extractWithGoogleVision(imageBase64: string): Promise<OcrExtractResponse> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) throw new Error('vision_not_configured');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`vision_http_${response.status}`);
  }

  const payload = (await response.json()) as {
    responses?: { fullTextAnnotation?: { text?: string } }[];
  };
  const ocrText = payload.responses?.[0]?.fullTextAnnotation?.text?.trim() ?? '';

  return {
    ocrText,
    confidence: ocrText ? 0.85 : 0.3,
    source: 'google_vision',
  };
}

export async function handleOcrExtract(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }

  try {
    const raw = await readBody(req, MAX_BODY_BYTES);
    const body = JSON.parse(raw) as OcrExtractRequest;
    const { docType, image } = body;

    if (!docType || typeof docType !== 'string') {
      json(res, 400, { error: 'invalid_doc_type' });
      return;
    }
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      json(res, 400, { error: 'invalid_image' });
      return;
    }

    const base64 = image.replace(/^data:image\/[a-z+]+;base64,/i, '');

    let result: OcrExtractResponse;
    if (process.env.OPENAI_API_KEY) {
      result = await extractWithOpenAI(docType, image);
    } else if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      result = await extractWithGoogleVision(base64);
    } else {
      json(res, 503, {
        error: 'ocr_not_configured',
        message: 'Set OPENAI_API_KEY or GOOGLE_CLOUD_VISION_API_KEY in .env for cloud OCR.',
      });
      return;
    }

    if (ID_DOC_TYPES.has(docType) && !result.ocrText && result.fields) {
      result.ocrText = Object.values(result.fields).join('\n');
    }

    json(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ocr_failed';
    json(res, 500, { error: 'ocr_failed', message });
  }
}
