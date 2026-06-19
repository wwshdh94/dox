import { describe, expect, it } from 'vitest';
import { findDuplicate } from './ocr';
import type { Document } from '@/types';

describe('ocr', () => {
  it('finds duplicate by reg number', () => {
    const docs: Document[] = [
      {
        id: '1',
        title: 'RC',
        docType: 'vehicle_rc',
        fields: { registrationNumber: 'MH01AB1234' },
        createdAt: '',
        updatedAt: '',
      },
    ];
    const dup = findDuplicate(docs, 'vehicle_rc', { registrationNumber: 'MH01AB1234' });
    expect(dup?.id).toBe('1');
  });
});
