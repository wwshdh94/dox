import { describe, expect, it } from 'vitest';
import {
  canManageFamilyAccess,
  getOwnerMember,
  getOtherFamilyMembers,
  getSessionMember,
  memberInitials,
  memberSelectLabel,
  docOwnerInitials,
} from './family';
import type { Document, FamilyMember, User } from '@/types';

const members: FamilyMember[] = [
  {
    id: 'owner',
    displayName: 'Rahul',
    email: 'rahul@gmail.com',
    relationship: 'Self',
    status: 'active',
    role: 'owner',
  },
  {
    id: 'spouse',
    displayName: 'Priya',
    email: 'priya@gmail.com',
    relationship: 'Spouse',
    status: 'active',
    role: 'viewer',
  },
  {
    id: 'disabled',
    displayName: 'Old',
    relationship: 'Parent',
    status: 'disabled',
    role: 'viewer',
  },
];

describe('family helpers', () => {
  it('finds owner member', () => {
    expect(getOwnerMember(members)?.id).toBe('owner');
  });

  it('lists other active family members', () => {
    expect(getOtherFamilyMembers(members).map((m) => m.id)).toEqual(['spouse']);
  });

  it('resolves session member by email', () => {
    const ownerUser: User = {
      id: 'u1',
      email: 'rahul@gmail.com',
      name: 'Rahul',
      plan: 'free',
      referralCode: 'ABC',
      referralUploads: 0,
      referralQualified: false,
    };
    const viewerUser: User = { ...ownerUser, email: 'priya@gmail.com', name: 'Priya' };
    expect(getSessionMember(members, ownerUser)?.id).toBe('owner');
    expect(getSessionMember(members, viewerUser)?.id).toBe('spouse');
  });

  it('allows family access management for owner only', () => {
    const ownerUser: User = {
      id: 'u1',
      email: 'rahul@gmail.com',
      name: 'Rahul',
      plan: 'free',
      referralCode: 'ABC',
      referralUploads: 0,
      referralQualified: false,
    };
    const viewerUser: User = { ...ownerUser, email: 'priya@gmail.com', name: 'Priya' };
    expect(canManageFamilyAccess(members, ownerUser)).toBe(true);
    expect(canManageFamilyAccess(members, viewerUser)).toBe(false);
  });

  it('derives member initials', () => {
    expect(memberInitials('Rahul Sharma')).toBe('RS');
    expect(memberInitials('Priya')).toBe('PR');
  });

  it('labels vault owner as Mine in member pickers', () => {
    expect(memberSelectLabel(members[0]!)).toBe('Mine');
    expect(memberSelectLabel(members[1]!)).toBe('Priya');
  });

  it('shows all initials for household docs', () => {
    const doc = {
      id: '1',
      title: 'RC',
      docType: 'vehicle_rc',
      assetId: 'veh1',
      fields: {},
      createdAt: '',
      updatedAt: '',
    } as Document;
    const initials = docOwnerInitials(doc, members, [{ id: 'veh1', type: 'vehicle', label: 'Car' }]);
    expect(initials).toEqual(['RA', 'PR']);
  });
});
