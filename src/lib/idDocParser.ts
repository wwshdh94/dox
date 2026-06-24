/** Parse Indian identity document fields from noisy OCR text. */

import type { DocType } from '@/types';

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

export interface PassportParseResult {
  passportNumber: string;
  fullName?: string;
  dateOfBirth?: string;
  dateOfIssue?: string;
  expiryDate?: string;
  nationality?: string;
  confidence: number;
}

export interface DrivingLicenseParseResult {
  licenseNumber: string;
  fullName?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  confidence: number;
}

/** 4th char: P=person, C=company, H=HUF, F=firm, A=AOP, T=trust, B=BOI, L=local authority, J=artificial juridical, G=government */
const PAN_ENTITY_TYPES = new Set(['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']);

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

/** Validate PAN format and entity-type letter (4th character). */
export function isValidPanNumber(value: string): boolean {
  const pan = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return false;
  return PAN_ENTITY_TYPES.has(pan[3]);
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
  return isValidPanNumber(pan) ? pan : null;
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

const DL_NUMBER_RE =
  /\b((?:DL[\s\-/]?)?[A-Z]{2}[\s\-/]?\d{2}[\s\-/]?\d{4}[\s\-/]?\d{4,7})\b/gi;
const DL_ALT_RE = /\bDL[\s\-]?(\d{2}[\s\-]?\d{11,15})\b/gi;

function findDrivingLicenseCandidates(text: string): string[] {
  const found = new Set<string>();
  const upper = text.toUpperCase();

  for (const match of upper.matchAll(DL_NUMBER_RE)) {
    const normalized = match[1].replace(/[\s\-/]+/g, '').toUpperCase();
    if (normalized.length >= 10 && normalized.length <= 20) found.add(normalized);
  }
  for (const match of upper.matchAll(DL_ALT_RE)) {
    const normalized = `DL${match[1].replace(/\D/g, '')}`;
    if (normalized.length >= 10) found.add(normalized);
  }
  return [...found];
}

function parseMrzDate(yymmdd: string): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  const iso = `${year}-${mm}-${dd}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return iso;
}

function cleanMrzName(raw: string): string {
  return raw
    .replace(/</g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

/** Parse ICAO TD3 passport MRZ (2 lines) from OCR text. */
export function parsePassportMrzFromText(rawText: string): PassportParseResult | null {
  const lines = normalizeOcrText(rawText)
    .toUpperCase()
    .split('\n')
    .map((l) => l.replace(/\s/g, ''))
    .filter((l) => l.length >= 30);

  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i];
    const l2 = lines[i + 1];
    if (!l1.startsWith('P<') || l2.length < 28) continue;

    const nameMatch = l1.match(/^P<[A-Z]{3}([A-Z<]+)<<([A-Z<]+)/);
    const l2Match = l2.match(/^([A-Z0-9<]{9})\d[A-Z<]{3}(\d{6})\d([MFX<])(\d{6})/);
    if (!l2Match) continue;

    const passportNumber = l2Match[1].replace(/</g, '').trim();
    const nationality = l2.slice(10, 13).replace(/</g, '');
    const dob = parseMrzDate(l2Match[2]);
    const expiry = parseMrzDate(l2Match[4]);

    let fullName: string | undefined;
    if (nameMatch) {
      const surname = cleanMrzName(nameMatch[1]);
      const given = cleanMrzName(nameMatch[2]);
      fullName = [given, surname].filter(Boolean).join(' ').trim() || undefined;
    }

    if (!passportNumber) continue;

    const result: PassportParseResult = {
      passportNumber,
      fullName,
      dateOfBirth: dob,
      expiryDate: expiry,
      nationality: nationality || undefined,
      confidence: 0,
    };
    let score = 0.7;
    if (fullName) score += 0.1;
    if (dob) score += 0.08;
    if (expiry) score += 0.08;
    result.confidence = Math.min(score, 0.95);
    return result;
  }

  return null;
}

export function parseDrivingLicenseFromText(rawText: string): DrivingLicenseParseResult | null {
  const text = normalizeOcrText(rawText);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const numbers = findDrivingLicenseCandidates(text);
  if (numbers.length === 0) return null;

  const licenseNumber = numbers[0];
  const names = extractNameCandidates(lines);
  const labeledName = extractLabelFollowedName(lines, /^name$/i);
  const dateOfBirth = extractDob(text);

  let expiryDate: string | undefined;
  for (const line of lines) {
    if (!/(VALID|EXPIR|VALIDITY|TILL|UPTO)/i.test(line)) continue;
    const dateMatch = line.match(DATE_ONLY_RE);
    if (dateMatch) {
      expiryDate = parseDateToIso(dateMatch[1]);
      if (expiryDate) break;
    }
  }

  const result: DrivingLicenseParseResult = {
    licenseNumber,
    fullName: labeledName ?? names[0],
    dateOfBirth,
    expiryDate,
    confidence: 0,
  };
  let score = 0.55;
  if (licenseNumber) score += 0.25;
  if (result.fullName) score += 0.1;
  if (dateOfBirth) score += 0.05;
  if (expiryDate) score += 0.05;
  result.confidence = Math.min(score, 0.92);
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

const VOTER_ID_RE = /\b([A-Z]{3}[0-9]{7})\b/gi;

function findVoterIdCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.toUpperCase().matchAll(VOTER_ID_RE)) {
    found.add(match[1].toUpperCase());
  }
  return [...found];
}

export interface VoterIdParseResult {
  voterIdNumber: string;
  fullName?: string;
  dateOfBirth?: string;
  confidence: number;
}

export function parseVoterIdFromText(rawText: string): VoterIdParseResult | null {
  const text = normalizeOcrText(rawText);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const ids = findVoterIdCandidates(text);
  if (ids.length === 0) return null;

  const names = extractNameCandidates(lines);
  const labeledName = extractLabelFollowedName(lines, /^name$/i);
  const dateOfBirth = extractDob(text);

  const result: VoterIdParseResult = {
    voterIdNumber: ids[0],
    fullName: labeledName ?? names[0],
    dateOfBirth,
    confidence: 0,
  };
  let score = 0.55;
  if (result.voterIdNumber) score += 0.25;
  if (result.fullName) score += 0.1;
  if (dateOfBirth) score += 0.05;
  result.confidence = Math.min(score, 0.9);
  return result;
}

export interface RegionParseInput {
  rawText: string;
  regions?: Record<string, string>;
  pageIndex?: number;
}

function mergeText(...parts: Array<string | undefined>): string {
  return parts.filter((p) => p?.trim()).join('\n');
}

/** Parse PAN using location-specific crops when available. */
export function parsePanFromRegions(regions: Record<string, string>): PanParseResult | null {
  const synthetic = mergeText(
    regions.name,
    regions.father_name ? `Father's Name\n${regions.father_name}` : undefined,
    regions.dob ? `DOB: ${regions.dob}` : undefined,
    regions.pan_number,
  );
  if (!synthetic.trim()) return null;
  const parsed = parsePanFromText(synthetic);
  if (!parsed) return null;
  if (regions.father_name?.trim() && !parsed.fathersName) {
    const fatherLine = regions.father_name.trim();
    if (looksLikeNameLine(fatherLine)) {
      parsed.fathersName = titleCaseName(fatherLine);
      parsed.confidence = scorePanConfidence(parsed);
    }
  }
  return parsed;
}

/** Parse Aadhaar using front/back region crops. */
export function parseAadhaarFromRegions(
  regions: Record<string, string>,
  pageIndex = 0,
): AadhaarParseResult | null {
  const aadhaarFromRegion = regions.aadhaar_number
    ? findAadhaarCandidates(regions.aadhaar_number)[0]
    : undefined;

  const synthetic =
    pageIndex === 0
      ? mergeText(
          regions.name,
          regions.dob ? `DOB: ${regions.dob}` : undefined,
          regions.gender,
        )
      : mergeText(regions.address, regions.father_name);

  const parsed = parseAadhaarFromText(
    aadhaarFromRegion ? `${synthetic}\n${aadhaarFromRegion}` : synthetic,
  );
  if (!parsed && !aadhaarFromRegion) return null;

  const result: AadhaarParseResult = parsed ?? {
    aadhaarNumber: aadhaarFromRegion!,
    confidence: 0,
  };

  if (aadhaarFromRegion) result.aadhaarNumber = aadhaarFromRegion;
  if (pageIndex === 0 && regions.name?.trim() && looksLikeNameLine(regions.name.trim())) {
    result.fullName = titleCaseName(regions.name.trim());
  }
  if (regions.dob?.trim()) {
    const dob = parseDateToIso(regions.dob.trim()) ?? parseDobFromLabeled(regions.dob);
    if (dob) result.dateOfBirth = dob;
  }
  if (regions.father_name?.trim()) {
    const rel = extractRelationName([regions.father_name]);
    if (rel) result.fathersName = rel;
    else if (looksLikeNameLine(regions.father_name.trim())) {
      result.fathersName = titleCaseName(regions.father_name.trim());
    }
  }

  result.confidence = scoreAadhaarConfidence(result);
  return result.aadhaarNumber || result.fullName ? result : null;
}

function parseDobFromLabeled(raw: string): string | undefined {
  const m = raw.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  return m ? parseDateToIso(m[1]) : undefined;
}

export function parsePassportFromRegions(regions: Record<string, string>): PassportParseResult | null {
  const mrzText = regions.mrz ?? '';
  const fromMrz = parsePassportMrzFromText(mrzText || regions.passport_number || '');
  if (fromMrz) return fromMrz;

  const synthetic = mergeText(regions.name, regions.passport_number);
  if (!synthetic.trim()) return null;
  return parsePassportMrzFromText(synthetic);
}

export function parseDrivingLicenseFromRegions(
  regions: Record<string, string>,
): DrivingLicenseParseResult | null {
  const synthetic = mergeText(
    regions.name,
    regions.license_number,
    regions.dob ? `DOB: ${regions.dob}` : undefined,
    regions.validity ? `Validity: ${regions.validity}` : undefined,
  );
  if (!synthetic.trim()) return null;
  return parseDrivingLicenseFromText(synthetic);
}

export function parseVoterIdFromRegions(regions: Record<string, string>): VoterIdParseResult | null {
  const synthetic = mergeText(
    regions.name,
    regions.voter_id,
    regions.dob ? `DOB: ${regions.dob}` : undefined,
  );
  if (!synthetic.trim()) return null;
  return parseVoterIdFromText(synthetic);
}

/** Doc-type field extraction — prefers ROI text, falls back to full-page OCR. */
export function parseDocFieldsForType(
  docType: DocType,
  input: RegionParseInput,
): PanParseResult | AadhaarParseResult | PassportParseResult | DrivingLicenseParseResult | VoterIdParseResult | null {
  const { rawText, regions, pageIndex = 0 } = input;
  const hasRegions = regions && Object.keys(regions).length > 0;

  if (docType === 'pan') {
    return (hasRegions ? parsePanFromRegions(regions!) : null) ?? parsePanFromText(rawText);
  }
  if (docType === 'aadhaar') {
    return (hasRegions ? parseAadhaarFromRegions(regions!, pageIndex) : null) ?? parseAadhaarFromText(rawText);
  }
  if (docType === 'passport') {
    return (hasRegions ? parsePassportFromRegions(regions!) : null) ?? parsePassportMrzFromText(rawText);
  }
  if (docType === 'driving_license') {
    return (hasRegions ? parseDrivingLicenseFromRegions(regions!) : null) ??
      parseDrivingLicenseFromText(rawText);
  }
  if (docType === 'voter_id') {
    return (hasRegions ? parseVoterIdFromRegions(regions!) : null) ?? parseVoterIdFromText(rawText);
  }
  return null;
}

