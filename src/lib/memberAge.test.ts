import { describe, expect, it } from 'vitest';
import { inferMemberBirthDate, memberAgeBand, memberAgeYears } from '@/lib/memberAge';
import type { Document } from '@/types';

const docs: Document[] = [
  {
    id: '1',
    title: 'Passport',
    docType: 'passport',
    memberId: 'm1',
    fields: { dateOfBirth: '2012-05-10' },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    title: 'Aadhaar',
    docType: 'aadhaar',
    memberId: 'm2',
    fields: { dateOfBirth: '1958-03-01' },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

describe('memberAge', () => {
  it('reads date of birth from identity documents', () => {
    expect(inferMemberBirthDate('m1', docs)).toBe('2012-05-10');
    expect(inferMemberBirthDate('m2', docs)).toBe('1958-03-01');
  });

  it('computes age bands', () => {
    const asOf = new Date('2026-06-21T12:00:00');
    expect(memberAgeYears('2012-05-10', asOf)).toBe(14);
    expect(memberAgeBand('2012-05-10', asOf)).toBe('child');
    expect(memberAgeBand('1958-03-01', asOf)).toBe('senior');
    expect(memberAgeBand('1990-01-01', asOf)).toBe('adult');
  });
});
