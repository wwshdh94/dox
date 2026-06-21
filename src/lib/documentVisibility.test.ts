import { describe, expect, it } from 'vitest';
import {
  canDeleteDocument,
  canManageDocumentFamilyAccess,
  canViewDocument,
  documentHasFamilyAccess,
  visibleMemberFamilyDocs,
} from '@/lib/documentVisibility';
import type { Document, FamilyMember, ShareGrant, User } from '@/types';

const owner: FamilyMember = {
  id: 'owner',
  displayName: 'Rahul',
  email: 'rahul@gmail.com',
  relationship: 'Self',
  status: 'active',
  role: 'owner',
  joinedAt: '2025-01-01T00:00:00.000Z',
};

const spouse: FamilyMember = {
  id: 'spouse',
  displayName: 'Priya',
  email: 'priya@gmail.com',
  relationship: 'Spouse',
  status: 'active',
  role: 'viewer',
};

const spouseJoined: FamilyMember = {
  ...spouse,
  joinedAt: '2025-06-01T00:00:00.000Z',
};

const child: FamilyMember = {
  id: 'child',
  displayName: 'Arjun',
  email: 'arjun@gmail.com',
  relationship: 'Son',
  status: 'active',
  role: 'viewer',
  parentMemberId: 'owner',
  dateOfBirth: '2012-05-10',
  joinedAt: '2025-06-01T00:00:00.000Z',
};

const ownerUser: User = {
  id: 'u1',
  email: 'rahul@gmail.com',
  name: 'Rahul',
  plan: 'free',
  referralCode: 'ABC',
  referralUploads: 0,
  referralQualified: false,
};

const spouseUser: User = { ...ownerUser, email: 'priya@gmail.com', name: 'Priya' };
const childUser: User = { ...ownerUser, email: 'arjun@gmail.com', name: 'Arjun' };

function doc(id: string, memberId: string): Document {
  return {
    id,
    title: 'Passport',
    docType: 'passport',
    memberId,
    domain: 'family',
    category: 'identity',
    fields: {},
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}

const allDocs = [doc('d1', 'spouse'), doc('d2', 'child')];

describe('documentVisibility', () => {
  it('detects family access grants', () => {
    const grants: ShareGrant[] = [{ id: 'g1', documentId: 'd1', memberId: 'spouse' }];
    expect(documentHasFamilyAccess('d1', grants)).toBe(true);
    expect(documentHasFamilyAccess('d2', grants)).toBe(false);
  });

  it('lets vault owner manage access until document owner joins', () => {
    const passport = doc('d1', 'spouse');
    expect(canManageDocumentFamilyAccess(passport, [owner, spouse], ownerUser, allDocs)).toBe(true);
    expect(canManageDocumentFamilyAccess(passport, [owner, spouseJoined], ownerUser, allDocs)).toBe(
      false,
    );
    expect(canManageDocumentFamilyAccess(passport, [owner, spouseJoined], spouseUser, allDocs)).toBe(
      true,
    );
  });

  it('hides private documents from other members once owner has joined', () => {
    const passport = doc('d1', 'spouse');
    const members = [owner, spouseJoined];
    const grants: ShareGrant[] = [];

    expect(canViewDocument(passport, members, spouseUser, grants, allDocs)).toBe(true);
    expect(canViewDocument(passport, members, ownerUser, grants, allDocs)).toBe(false);
  });

  it('shows shared documents to granted family members only', () => {
    const passport = doc('d1', 'spouse');
    const members = [owner, spouseJoined];
    const grants: ShareGrant[] = [{ id: 'g1', documentId: 'd1', memberId: 'owner' }];

    expect(canViewDocument(passport, members, ownerUser, grants, allDocs)).toBe(true);
    expect(canViewDocument(passport, members, spouseUser, grants, allDocs)).toBe(true);
  });

  it('filters listed family docs for the current session', () => {
    const docs = [doc('d1', 'spouse'), doc('d2', 'spouse')];
    const grants: ShareGrant[] = [{ id: 'g1', documentId: 'd1', memberId: 'owner' }];
    const visible = visibleMemberFamilyDocs(
      docs,
      'spouse',
      [owner, spouseJoined],
      ownerUser,
      grants,
    );
    expect(visible.map((d) => d.id)).toEqual(['d1']);
  });

  it('lets minors view their own documents but restricts management to parents', () => {
    const childDoc = doc('d2', 'child');
    const members = [owner, spouseJoined, child];
    const grants: ShareGrant[] = [{ id: 'g1', documentId: 'd2', memberId: 'spouse' }];

    expect(canViewDocument(childDoc, members, ownerUser, grants, allDocs)).toBe(true);
    expect(canViewDocument(childDoc, members, spouseUser, grants, allDocs)).toBe(true);
    expect(canViewDocument(childDoc, members, childUser, grants, allDocs)).toBe(true);
    expect(canManageDocumentFamilyAccess(childDoc, members, childUser, allDocs)).toBe(false);
    expect(canManageDocumentFamilyAccess(childDoc, members, ownerUser, allDocs)).toBe(true);
    expect(canDeleteDocument(childDoc, members, childUser, allDocs)).toBe(false);
    expect(canDeleteDocument(childDoc, members, ownerUser, allDocs)).toBe(true);
  });
});
