import { describe, expect, it } from 'vitest';
import { getOwnerMember, getOtherFamilyMembers, memberInitials, docOwnerInitials } from './family';
import type { Document, FamilyMember } from '@/types';

const members: FamilyMember[] = [
  {
    id: 'owner',
    displayName: 'Rahul',
    relationship: 'Self',
    status: 'active',
    role: 'owner',
  },
  {
    id: 'spouse',
    displayName: 'Priya',
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

  it('derives member initials', () => {
    expect(memberInitials('Rahul Sharma')).toBe('RS');
    expect(memberInitials('Priya')).toBe('PR');
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
