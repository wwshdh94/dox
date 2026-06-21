import { categoryForDocType } from '@/lib/docTags';
import type { DocCategory, DocType } from '@/types';

const DOC_TYPE_ICON: Partial<Record<DocType, string>> = {
  passport: 'passport',
  pan: 'pan',
  aadhaar: 'aadhaar',
  driving_license: 'license',
  voter_id: 'id',
  ration_card: 'card',
  vehicle_rc: 'vehicle_rc',
  vehicle_puc: 'vehicle_puc',
  vehicle_insurance: 'vehicle_insurance',
  insurance: 'insurance',
  health_insurance: 'health_insurance',
  lab_report: 'lab_report',
  prescription: 'prescription',
  vaccination: 'vaccination',
  medical_bill: 'medical_bill',
  discharge_summary: 'discharge_summary',
  purchase_receipt: 'purchase_receipt',
  warranty: 'warranty',
  other: 'other',
};

const CATEGORY_ICON: Record<DocCategory, string> = {
  identity: 'identity',
  health_medical: 'health_medical',
  vehicle: 'vehicle',
  property: 'property',
  financial: 'financial',
  education: 'education',
  purchase: 'purchase',
  legal: 'legal',
  other: 'other',
};

/** Title keywords for non-standard documents — longest / most specific first. */
const TITLE_KEYWORD_ICONS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /\b(driving|driver'?s?)\s+licen[cs]e\b/i, slug: 'license' },
  { pattern: /\b(birth|marriage|death|character|experience|completion)\s+certificate\b/i, slug: 'certificate' },
  { pattern: /\b(offer|appointment|relieving|reference|cover)\s+letter\b/i, slug: 'letter' },
  { pattern: /\b(rent|lease|sale|purchase|employment|service)\s+(agreement|deed|contract)\b/i, slug: 'contract' },
  { pattern: /\b(bank|account|credit\s*card|card)\s+statement\b/i, slug: 'statement' },
  { pattern: /\b(insurance|health|life|term|vehicle)\s+policy\b/i, slug: 'policy' },
  { pattern: /\b(electricity|phone|mobile|water|gas|broadband|utility|medical|hospital)\s+bill\b/i, slug: 'bill' },
  { pattern: /\b(credit|debit|atm|business|visiting|membership|loyalty)\s+card\b/i, slug: 'card' },
  { pattern: /\b(tax|gst)\s+invoice\b/i, slug: 'invoice' },
  { pattern: /\b(entry|parking|travel|movie|event)\s+(pass|ticket)\b/i, slug: 'ticket' },
  { pattern: /\b(entry|gate|work|visitor)\s+pass\b/i, slug: 'pass' },
  { pattern: /\b(voter|employee|student|national)\s+id\b/i, slug: 'id' },
  { pattern: /\b(traffic|e-?)?challan\b/i, slug: 'challan' },
  { pattern: /\b(gift|discount|promo)\s+voucher\b/i, slug: 'voucher' },
  { pattern: /\b(resume|curriculum\s+vitae|cv)\b/i, slug: 'resume' },
  { pattern: /\b(photo|photograph|picture|image)\b/i, slug: 'photo' },
  { pattern: /\b(receipt)\b/i, slug: 'receipt' },
  { pattern: /\b(invoice)\b/i, slug: 'invoice' },
  { pattern: /\b(cheque|check)\b/i, slug: 'cheque' },
  { pattern: /\b(voucher)\b/i, slug: 'voucher' },
  { pattern: /\b(permit)\b/i, slug: 'permit' },
  { pattern: /\b(bill)\b/i, slug: 'bill' },
  { pattern: /\b(certificate|cert)\b/i, slug: 'certificate' },
  { pattern: /\b(report|summary|analysis)\b/i, slug: 'report' },
  { pattern: /\b(letter|memo|memorandum)\b/i, slug: 'letter' },
  { pattern: /\b(contract|agreement|deed|affidavit|notary)\b/i, slug: 'contract' },
  { pattern: /\b(licen[cs]e|permit)\b/i, slug: 'license' },
  { pattern: /\b(policy|policies)\b/i, slug: 'policy' },
  { pattern: /\b(statement|passbook)\b/i, slug: 'statement' },
  { pattern: /\b(application|registration)\s+form\b/i, slug: 'form' },
  { pattern: /\b(form|questionnaire|survey)\b/i, slug: 'form' },
  { pattern: /\b(card)\b/i, slug: 'card' },
  { pattern: /\b(ticket)\b/i, slug: 'ticket' },
  { pattern: /\b(pass)\b/i, slug: 'pass' },
];

export function titleKeywordIconSlug(title: string | undefined): string | null {
  const normalized = title?.trim();
  if (!normalized) return null;
  for (const { pattern, slug } of TITLE_KEYWORD_ICONS) {
    if (pattern.test(normalized)) return slug;
  }
  return null;
}

export function docIconSlug(
  docType: DocType,
  category?: DocCategory,
  title?: string,
): string {
  if (docType === 'other') {
    const keyword = titleKeywordIconSlug(title);
    if (keyword) return keyword;
  }
  return DOC_TYPE_ICON[docType] ?? CATEGORY_ICON[category ?? categoryForDocType(docType)];
}

export function docIconSrc(
  docType: DocType,
  category?: DocCategory,
  title?: string,
): string {
  return `/icons/docs/${docIconSlug(docType, category, title)}.png`;
}

/** Zoom specific icons inside the pill rail without changing rail/pill size. */
const FILL_ICON_SCALE: Partial<Record<string, number>> = {
  passport: 1.3,
  bill: 1.3,
};

export function docIconFillScale(
  docType: DocType,
  category?: DocCategory,
  title?: string,
): number {
  const slug = docIconSlug(docType, category, title);
  return FILL_ICON_SCALE[slug] ?? 1;
}

export const DOC_ICON_SIZES = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

export type DocIconSize = keyof typeof DOC_ICON_SIZES;
