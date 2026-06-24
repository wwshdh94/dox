import type {
  DocCategory,
  DocDomain,
  DocType,
  Document,
  DocumentReviewStatus,
  ShareGrant,
} from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getMyHouseholdId } from '@/lib/supabase/households';
import { getDocumentFilePages } from '@/lib/documentPages';
import {
  deleteDocumentFileFromStorage,
  documentStoragePath,
  uploadEncryptedDocumentFile,
} from '@/lib/supabase/docStorage';
import { formatDocumentSyncError } from '@/lib/supabase/limits';

export interface DocumentRow {
  id: string;
  household_id: string;
  created_by: string;
  owner_member_id: string | null;
  title: string;
  doc_type: string;
  domain: string;
  category: string | null;
  member_id: string | null;
  asset_id: string | null;
  expiry_date: string | null;
  review_status: string;
  fields: Record<string, string | number | null | undefined>;
  notes: string | null;
  file_name: string | null;
  storage_path: string | null;
  archived_at: string | null;
  renewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareGrantRow {
  id: string;
  household_id: string;
  document_id: string;
  grantee_member_id: string;
  grantee_user_id: string | null;
  created_by: string;
  created_at: string;
}

export function documentToRow(
  doc: Document,
  householdId: string,
  userId: string,
): Omit<DocumentRow, 'created_at' | 'updated_at'> & { created_at: string; updated_at: string } {
  return {
    id: doc.id,
    household_id: householdId,
    created_by: userId,
    owner_member_id: doc.memberId ?? null,
    title: doc.title,
    doc_type: doc.docType,
    domain: doc.domain ?? 'family',
    category: doc.category ?? null,
    member_id: doc.memberId ?? null,
    asset_id: doc.assetId ?? null,
    expiry_date: doc.expiryDate ?? null,
    review_status: doc.reviewStatus ?? 'reviewed',
    fields: doc.fields,
    notes: doc.notes ?? null,
    file_name: doc.fileName ?? null,
    storage_path: doc.storagePath ?? null,
    archived_at: doc.archivedAt ?? null,
    renewed_at: doc.renewedAt ?? null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

export function rowToDocument(row: DocumentRow, localFileDataUrl?: string): Document {
  return {
    id: row.id,
    title: row.title,
    docType: row.doc_type as DocType,
    domain: row.domain as DocDomain,
    category: (row.category as DocCategory | null) ?? undefined,
    memberId: row.member_id ?? undefined,
    assetId: row.asset_id ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    fields: row.fields ?? {},
    notes: row.notes ?? undefined,
    fileName: row.file_name ?? undefined,
    storagePath: row.storage_path ?? undefined,
    fileDataUrl: row.storage_path ? undefined : localFileDataUrl,
    createdBy: row.created_by,
    reviewStatus: row.review_status as DocumentReviewStatus,
    archivedAt: row.archived_at ?? undefined,
    renewedAt: row.renewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToShareGrant(row: ShareGrantRow): ShareGrant {
  return {
    id: row.id,
    documentId: row.document_id,
    memberId: row.grantee_member_id,
  };
}

function isFamilyDoc(doc: Document): boolean {
  return (doc.domain ?? 'family') === 'family';
}

async function resolveGranteeUserId(email: string | undefined): Promise<string | null> {
  if (!email?.trim()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('resolve_household_member_user_id', {
    target_email: email.trim(),
  });
  if (error || !data) return null;
  return data as string;
}

export async function pullHouseholdVault(): Promise<
  | { ok: true; documents: Document[]; shareGrants: ShareGrant[] }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const householdId = await getMyHouseholdId();
  if (!householdId) return { ok: false, error: 'No household membership' };

  const [docsRes, grantsRes] = await Promise.all([
    supabase.from('documents').select('*').eq('household_id', householdId).eq('domain', 'family'),
    supabase.from('share_grants').select('*').eq('household_id', householdId),
  ]);

  if (docsRes.error) return { ok: false, error: docsRes.error.message };
  if (grantsRes.error) return { ok: false, error: grantsRes.error.message };

  const documents = ((docsRes.data ?? []) as DocumentRow[]).map((row) => rowToDocument(row));
  const shareGrants = ((grantsRes.data ?? []) as ShareGrantRow[]).map((row) => rowToShareGrant(row));

  return { ok: true, documents, shareGrants };
}

export async function upsertDocumentToServer(
  doc: Document,
): Promise<{ ok: true; storagePath?: string; createdBy?: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !isFamilyDoc(doc)) {
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: userError?.message ?? 'Not signed in' };

  const householdId = await getMyHouseholdId();
  if (!householdId) return { ok: false, error: 'No household membership' };

  let storagePath = doc.storagePath ?? null;
  if (!storagePath && doc.fileDataUrl) {
    storagePath = documentStoragePath(householdId, doc.id);
  }

  const row = {
    ...documentToRow({ ...doc, storagePath: storagePath ?? undefined }, householdId, user.id),
    storage_path: storagePath,
  };
  const { error } = await supabase.from('documents').upsert(row, { onConflict: 'id' });
  if (error) return { ok: false, error: formatDocumentSyncError(error.message) };

  if (doc.fileDataUrl && storagePath) {
    const pages = getDocumentFilePages(doc);
    const upload = await uploadEncryptedDocumentFile(householdId, doc.id, pages, user.id);
    if (!upload.ok) return upload;
  }

  return { ok: true, storagePath: storagePath ?? undefined, createdBy: user.id };
}

export async function deleteDocumentFromServer(
  documentId: string,
  storagePath?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  let path = storagePath ?? null;
  if (!path) {
    const { data } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .maybeSingle();
    path = (data as { storage_path?: string | null } | null)?.storage_path ?? null;
  }

  if (path) {
    const removed = await deleteDocumentFileFromStorage(path);
    if (!removed.ok) return removed;
  }

  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertShareGrantToServer(
  grant: ShareGrant,
  memberEmail?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: userError?.message ?? 'Not signed in' };

  const householdId = await getMyHouseholdId();
  if (!householdId) return { ok: false, error: 'No household membership' };

  const granteeUserId = await resolveGranteeUserId(memberEmail);

  const { error } = await supabase.from('share_grants').upsert(
    {
      id: grant.id,
      household_id: householdId,
      document_id: grant.documentId,
      grantee_member_id: grant.memberId,
      grantee_user_id: granteeUserId,
      created_by: user.id,
    },
    { onConflict: 'document_id,grantee_member_id' },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteShareGrantFromServer(
  documentId: string,
  memberId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const { error } = await supabase
    .from('share_grants')
    .delete()
    .eq('document_id', documentId)
    .eq('grantee_member_id', memberId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function mergeServerVault(
  localDocuments: Document[],
  localShareGrants: ShareGrant[],
  serverDocuments: Document[],
  serverShareGrants: ShareGrant[],
): { documents: Document[]; shareGrants: ShareGrant[] } {
  const docById = new Map(localDocuments.map((d) => [d.id, d]));

  for (const serverDoc of serverDocuments) {
    const local = docById.get(serverDoc.id);
    if (!local || new Date(serverDoc.updatedAt) >= new Date(local.updatedAt)) {
      docById.set(serverDoc.id, {
        ...serverDoc,
        storagePath: serverDoc.storagePath ?? local?.storagePath,
        fileDataUrl: serverDoc.storagePath ? undefined : local?.fileDataUrl,
        additionalFileDataUrls: serverDoc.storagePath
          ? undefined
          : serverDoc.additionalFileDataUrls ?? local?.additionalFileDataUrls,
        createdBy: serverDoc.createdBy ?? local?.createdBy,
      });
    }
  }

  const grantKey = (g: ShareGrant) => `${g.documentId}:${g.memberId}`;
  const grantsByKey = new Map(localShareGrants.map((g) => [grantKey(g), g]));
  for (const grant of serverShareGrants) {
    grantsByKey.set(grantKey(grant), grant);
  }

  return {
    documents: Array.from(docById.values()),
    shareGrants: Array.from(grantsByKey.values()),
  };
}
