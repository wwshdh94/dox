import type { DocCategory, DocDomain, DocType, Document } from '@/types';

/** Tab scope — where the document appears in PreVault. */
export const DOC_DOMAINS: DocDomain[] = ['family', 'health', 'assets'];

/** Subject-matter class (ISO 15489 / household records adapted for India). */
export const DOC_CATEGORIES: DocCategory[] = [
  'identity',
  'health_medical',
  'vehicle',
  'property',
  'financial',
  'education',
  'purchase',
  'legal',
  'other',
];

export const DOMAIN_LABELS: Record<DocDomain, string> = {
  family: 'Family',
  health: 'Health',
  assets: 'Assets',
};

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  identity: 'Identity & KYC',
  health_medical: 'Health & Medical',
  vehicle: 'Vehicle & Transport',
  property: 'Property & Home',
  financial: 'Financial & Insurance',
  education: 'Education & Career',
  purchase: 'Purchases & Warranty',
  legal: 'Legal & Compliance',
  other: 'Other',
};

const HEALTH_TYPES: DocType[] = [
  'health_insurance',
  'lab_report',
  'prescription',
  'vaccination',
  'medical_bill',
  'discharge_summary',
];

const TYPE_CATEGORY: Partial<Record<DocType, DocCategory>> = {
  passport: 'identity',
  pan: 'identity',
  aadhaar: 'identity',
  vehicle_rc: 'vehicle',
  vehicle_puc: 'vehicle',
  vehicle_insurance: 'vehicle',
  insurance: 'financial',
  health_insurance: 'health_medical',
  lab_report: 'health_medical',
  prescription: 'health_medical',
  vaccination: 'health_medical',
  medical_bill: 'health_medical',
  discharge_summary: 'health_medical',
  purchase_receipt: 'purchase',
  warranty: 'purchase',
  other: 'other',
};

export function categoryForDocType(docType: DocType): DocCategory {
  return TYPE_CATEGORY[docType] ?? 'other';
}

export function inferDocTags(
  docType: DocType,
  opts: { memberId?: string; assetId?: string; uploadContext?: string },
): { domain: DocDomain; category: DocCategory } {
  const category = categoryForDocType(docType);

  if (HEALTH_TYPES.includes(docType) || opts.uploadContext === 'health') {
    return { domain: 'health', category: 'health_medical' };
  }
  if (opts.assetId) {
    return { domain: 'assets', category };
  }
  return { domain: 'family', category };
}

export function resolveDocTags(doc: Document): { domain: DocDomain; category: DocCategory } {
  if (doc.domain && doc.category) {
    return { domain: doc.domain, category: doc.category };
  }
  return inferDocTags(doc.docType, {
    memberId: doc.memberId,
    assetId: doc.assetId,
    uploadContext: HEALTH_TYPES.includes(doc.docType) ? 'health' : undefined,
  });
}

export function isHealthDomainDoc(doc: Document): boolean {
  return resolveDocTags(doc).domain === 'health';
}

export function isFamilyDomainDoc(doc: Document): boolean {
  return resolveDocTags(doc).domain === 'family';
}

export function isAssetsDomainDoc(doc: Document): boolean {
  return resolveDocTags(doc).domain === 'assets';
}

export function docsForMemberByDomain(
  docs: Document[],
  memberId: string,
  domain: DocDomain,
): Document[] {
  return docs.filter(
    (d) => !d.archivedAt && d.memberId === memberId && resolveDocTags(d).domain === domain,
  );
}

export function docsForAsset(docs: Document[], assetId: string): Document[] {
  return docs.filter((d) => !d.archivedAt && d.assetId === assetId && isAssetsDomainDoc(d));
}
