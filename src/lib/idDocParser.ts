/** Parse Indian identity document fields from noisy OCR text. */

export interface PanParseResult {
  panNumber: string;
  fullName?: string;
  fathersName?: string;
  dateOfBirth?: string;
  confidence: number;
}

export interface AadhaarParseResult {
  aadhaarNumber: string;
  fullName?: string;
  dateOfBirth?: string;
  fathersName?: string;
  confidence: number;
}

const PAN_RE = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g;
const AADHAAR_SPACED_RE = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g;
const AADHAAR_DIGITS_RE = /\b(\d{12})\b/g;

const SKIP_NAME_LINE =
  /\b(GOVT|GOVERNMENT|INDIA|INCOME|TAX|DEPARTMENT|PERMANENT|ACCOUNT|NUMBER|CARD|AADHAAR|AADHAR|UIDAI|UNIQUE|IDENTIFICATION|AUTHORITY|DOB|YOB|YEAR|BIRTH|MALE|FEMALE|TRANSGENDER|ADDRESS|VALID|HELP|WWW|UIDAI\.GOV|ENROL|ENROLL|VID|VIRTUAL|ID|QR|CODE)\b/i;

const NAME_LABEL_LINE =
  /^(?:name|father'?s?\s*name|mother'?s?\s*name|husband'?s?\s*name|spouse'?s?\s*name|guardian'?s?\s*name)$/i;

const RELATION_RE = /(?:S\/O|D\/O|W\/O|C\/O|SON\s+OF|DAUGHTER\s+OF|WIFE\s+OF)\s*[:\-]?\s*(.+)/i;
const DOB_RE =
  /\b(?:DOB|D\.?O\.?B\.?|DATE\s+OF\s+BIRTH|BIRTH|YOB|YEAR\s+OF\s+BIRTH)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4})\b/i;
const DATE_ONLY_RE = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/;

/** Normalize OCR text for downstream parsing. */
export function normalizeOcrText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[|]/g, 'I')
    .replace(/[`'""]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Verhoeff checksum — validates Aadhaar numbers. */
export function isValidAadhaarNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12 || digits[0] === '0' || digits[0] === '1') return false;

  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 8, 7, 6, 5, 4, 0, 3, 2, 1],
    [7, 9, 5, 6, 7, 8, 1, 2, 3, 4],
    [8, 5, 6, 7, 8, 9, 2, 3, 4, 0],
    [9, 6, 7, 8, 9, 5, 4, 3, 2, 1],
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];

  let c = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = d[c][p[i % 8][Number(reversed[i])]];
  }
  return c === 0;
}

function fixPanCandidate(raw: string): string | null {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').split('');
  if (chars.length !== 10) return null;

  const letterFix: Record<string, string> = {
    '0': 'O',
    '1': 'I',
    '5': 'S',
    '8': 'B',
    '2': 'Z',
    '6': 'G',
  };
  const digitFix: Record<string, string> = {
    O: '0',
    Q: '0',
    D: '0',
    I: '1',
    L: '1',
    Z: '2',
    S: '5',
    B: '8',
    G: '6',
  };

  for (let i = 0; i < 10; i++) {
    const ch = chars[i];
    const isLetterSlot = i < 5 || i === 9;
    if (isLetterSlot) {
      chars[i] = /[A-Z]/.test(ch) ? ch : (letterFix[ch] ?? ch);
    } else {
      chars[i] = /[0-9]/.test(ch) ? ch : (digitFix[ch] ?? ch);
    }
  }

  const pan = chars.join('');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return null;
  return pan;
}

function findPanCandidates(text: string): string[] {
  const upper = text.toUpperCase();
  const found = new Set<string>();

  for (const match of upper.matchAll(PAN_RE)) {
    const fixed = fixPanCandidate(match[1]);
    if (fixed) found.add(fixed);
  }

  // OCR often breaks PAN across spaces: ABC DE 1234 F
  const compact = upper.replace(/[^A-Z0-9]/g, '');
  for (let i = 0; i <= compact.length - 10; i++) {
    const fixed = fixPanCandidate(compact.slice(i, i + 10));
    if (fixed) found.add(fixed);
  }

  return [...found];
}

function findAadhaarCandidates(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(AADHAAR_SPACED_RE)) {
    const digits = match[1].replace(/\D/g, '');
    if (digits.length === 12) found.add(digits);
  }

  for (const match of text.matchAll(AADHAAR_DIGITS_RE)) {
    found.add(match[1]);
  }

  const compact = text.replace(/\D/g, '');
  for (let i = 0; i <= compact.length - 12; i++) {
    found.add(compact.slice(i, i + 12));
  }

  return [...found].filter(isValidAadhaarNumber);
}

function looksLikeNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  if (NAME_LABEL_LINE.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;
  if (SKIP_NAME_LINE.test(trimmed)) return false;
  if (!/^[A-Za-z][A-Za-z\s.'-]+$/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;
  return words.every((w) => w.length >= 2);
}

function titleCaseName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseDateToIso(raw: string): string | undefined {
  const value = raw.trim();
  if (/^\d{4}$/.test(value)) return `${value}-01-01`;

  const m = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return undefined;

  let [, dd, mm, yy] = m;
  let year = Number(yy);
  if (yy.length === 2) year = year <= 30 ? 2000 + year : 1900 + year;

  const day = dd.padStart(2, '0');
  const month = mm.padStart(2, '0');
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== Number(month)) return undefined;
  return iso;
}

function extractDob(text: string): string | undefined {
  const labeled = text.match(DOB_RE);
  if (labeled) return parseDateToIso(labeled[1]);

  for (const line of text.split('\n')) {
    if (!/(DOB|BIRTH|YOB)/i.test(line)) continue;
    const dateMatch = line.match(DATE_ONLY_RE);
    if (dateMatch) {
      const iso = parseDateToIso(dateMatch[1]);
      if (iso) return iso;
    }
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) return parseDateToIso(yearMatch[0]);
  }

  for (const line of text.split('\n')) {
    const dateMatch = line.match(DATE_ONLY_RE);
    if (!dateMatch) continue;
    const iso = parseDateToIso(dateMatch[1]);
    if (iso) return iso;
  }

  return undefined;
}

function extractLabelFollowedName(lines: string[], labelRe: RegExp): string | undefined {
  for (let i = 0; i < lines.length - 1; i++) {
    if (!labelRe.test(lines[i])) continue;
    const next = lines[i + 1]?.trim();
    if (next && looksLikeNameLine(next)) return titleCaseName(next);
  }
  return undefined;
}

function extractRelationName(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(RELATION_RE);
    if (match?.[1] && looksLikeNameLine(match[1])) {
      return titleCaseName(match[1].replace(/[,;].*$/, '').trim());
    }
  }

  return extractLabelFollowedName(lines, /^father'?s?\s*name$/i);
}

function extractNameCandidates(lines: string[]): string[] {
  const names: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[^A-Za-z]+/, '').trim();
    if (looksLikeNameLine(cleaned)) names.push(titleCaseName(cleaned));
  }
  return names;
}

function scorePanConfidence(result: PanParseResult): number {
  let score = 0.55;
  if (result.panNumber) score += 0.25;
  if (result.fullName) score += 0.1;
  if (result.dateOfBirth) score += 0.05;
  if (result.fathersName) score += 0.05;
  return Math.min(score, 0.95);
}

function scoreAadhaarConfidence(result: AadhaarParseResult): number {
  let score = 0.55;
  if (result.aadhaarNumber) score += 0.25;
  if (result.fullName) score += 0.1;
  if (result.dateOfBirth) score += 0.05;
  if (result.fathersName) score += 0.05;
  return Math.min(score, 0.95);
}

export function parsePanFromText(rawText: string): PanParseResult | null {
  const text = normalizeOcrText(rawText);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const pans = findPanCandidates(text);
  if (pans.length === 0) return null;

  const panNumber = pans[0];
  const names = extractNameCandidates(lines);
  const labeledName = extractLabelFollowedName(lines, /^name$/i);
  const fathersName = extractRelationName(lines);
  const dateOfBirth = extractDob(text);

  let fullName: string | undefined = labeledName ?? names[0];
  if (fathersName && fullName === fathersName) {
    fullName = names.find((n) => n !== fathersName) ?? fullName;
  }

  const result: PanParseResult = {
    panNumber,
    fullName,
    fathersName,
    dateOfBirth,
    confidence: 0,
  };
  result.confidence = scorePanConfidence(result);
  return result;
}

export function parseAadhaarFromText(rawText: string): AadhaarParseResult | null {
  const text = normalizeOcrText(rawText);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const numbers = findAadhaarCandidates(text);
  if (numbers.length === 0) return null;

  const aadhaarNumber = numbers[0];
  const names = extractNameCandidates(lines);
  const labeledName = extractLabelFollowedName(lines, /^name$/i);
  const fathersName = extractRelationName(lines);
  const dateOfBirth = extractDob(text);

  let fullName: string | undefined = labeledName ?? names[0];
  if (fathersName && fullName === fathersName) {
    fullName = names.find((n) => n !== fathersName) ?? fullName;
  }

  const result: AadhaarParseResult = {
    aadhaarNumber,
    fullName,
    dateOfBirth,
    fathersName,
    confidence: 0,
  };
  result.confidence = scoreAadhaarConfidence(result);
  return result;
}
