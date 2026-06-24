import { describe, expect, it } from 'vitest';
import {
  documentToRow,
  mergeServerVault,
  rowToDocument,
  rowToShareGrant,
  type DocumentRow,
  type ShareGrantRow,
} from '@/lib/supabase/documents';
import type { Document, ShareGrant } from '@/types';

const baseDoc: Document = {
  id: 'doc-1',
  title: 'PAN Card',
  docType: 'pan',
  domain: 'family',
  category: 'identity',
  memberId: 'member-1',
  fields: { panNumber: 'ABCDE1234F' },
  reviewStatus: 'reviewed',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('supabase/documents', () => {
  it('maps document to row and back', () => {
    const row = documentToRow(
      { ...baseDoc, storagePath: 'household-1/doc-1.enc' },
      'household-1',
      'user-1',
    );
    expect(row.household_id).toBe('household-1');
    expect(row.storage_path).toBe('household-1/doc-1.enc');

    const restored = rowToDocument(row as DocumentRow, 'data:image/png;base64,abc');
    expect(restored.title).toBe('PAN Card');
    expect(restored.storagePath).toBe('household-1/doc-1.enc');
    expect(restored.fileDataUrl).toBeUndefined();
    expect(restored.createdBy).toBe('user-1');
  });

  it('maps share grant row', () => {
    const row: ShareGrantRow = {
      id: 'grant-1',
      household_id: 'household-1',
      document_id: 'doc-1',
      grantee_member_id: 'member-2',
      grantee_user_id: 'user-2',
      created_by: 'user-1',
      created_at: '2026-06-01T00:00:00.000Z',
    };
    expect(rowToShareGrant(row)).toEqual({
      id: 'grant-1',
      documentId: 'doc-1',
      memberId: 'member-2',
    });
  });

  it('mergeServerVault prefers newer server doc but keeps local file when not on server', () => {
    const local: Document[] = [
      {
        ...baseDoc,
        title: 'Old title',
        fileDataUrl: 'local-file',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ];
    const server: Document[] = [
      {
        ...baseDoc,
        title: 'Server title',
        updatedAt: '2026-06-02T00:00:00.000Z',
      },
    ];
    const merged = mergeServerVault(local, [], server, []);
    expect(merged.documents[0]?.title).toBe('Server title');
    expect(merged.documents[0]?.fileDataUrl).toBe('local-file');
  });

  it('mergeServerVault clears local file when server has storagePath', () => {
    const local: Document[] = [
      {
        ...baseDoc,
        fileDataUrl: 'local-file',
        updatedAt: '2026-06-02T00:00:00.000Z',
      },
    ];
    const server: Document[] = [
      {
        ...baseDoc,
        storagePath: 'household-1/doc-1.enc',
        updatedAt: '2026-06-03T00:00:00.000Z',
      },
    ];
    const merged = mergeServerVault(local, [], server, []);
    expect(merged.documents[0]?.storagePath).toBe('household-1/doc-1.enc');
    expect(merged.documents[0]?.fileDataUrl).toBeUndefined();
  });

  it('mergeServerVault unions share grants by document+member', () => {
    const localGrants: ShareGrant[] = [{ id: 'g1', documentId: 'doc-1', memberId: 'm1' }];
    const serverGrants: ShareGrant[] = [{ id: 'g2', documentId: 'doc-1', memberId: 'm2' }];
    const merged = mergeServerVault([], localGrants, [], serverGrants);
    expect(merged.shareGrants).toHaveLength(2);
  });
});
