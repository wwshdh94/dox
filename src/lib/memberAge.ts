import type { Document } from '@/types';

const DOB_FIELD_KEYS = ['dateOfBirth', 'dob', 'birthDate'] as const;

const ADULT_AGE = 18;
const SENIOR_AGE = 60;

export type MemberAgeBand = 'child' | 'adult' | 'senior';

function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Best-effort birth date from verified identity documents for a member. */
export function inferMemberBirthDate(memberId: string, documents: Document[]): string | undefined {
  const memberDocs = documents.filter((d) => d.memberId === memberId && !d.archivedAt);
  const priority = ['passport', 'aadhaar'] as const;

  for (const docType of priority) {
    const doc = memberDocs.find((d) => d.docType === docType);
    if (!doc?.fields) continue;
    for (const key of DOB_FIELD_KEYS) {
      const raw = doc.fields[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
    }
  }

  for (const doc of memberDocs) {
    for (const key of DOB_FIELD_KEYS) {
      const raw = doc.fields?.[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
    }
  }

  return undefined;
}

export function memberAgeYears(birthDate: string | undefined, asOf = new Date()): number | undefined {
  const born = birthDate ? parseIsoDate(birthDate) : null;
  if (!born) return undefined;

  let years = asOf.getFullYear() - born.getFullYear();
  const monthDelta = asOf.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < born.getDate())) {
    years -= 1;
  }
  return years >= 0 ? years : undefined;
}

export function memberAgeBand(
  birthDate: string | undefined,
  asOf = new Date(),
): MemberAgeBand | undefined {
  const years = memberAgeYears(birthDate, asOf);
  if (years === undefined) return undefined;
  if (years < ADULT_AGE) return 'child';
  if (years >= SENIOR_AGE) return 'senior';
  return 'adult';
}
