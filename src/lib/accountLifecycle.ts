import { memberHasJoined } from '@/lib/memberActivity';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { FamilyMember } from '@/types';

export interface TransferCandidate {
  userId: string;
  email: string;
  displayName: string;
  memberId?: string;
}

export function familyTransferCandidates(members: FamilyMember[]): FamilyMember[] {
  return members.filter(
    (m) => m.role !== 'owner' && m.status === 'active' && memberHasJoined(m) && Boolean(m.email?.trim()),
  );
}

/** Match joined family members to server household users by email. */
export function mergeTransferCandidates(
  familyMembers: FamilyMember[],
  serverCandidates: Array<{ user_id: string; email: string; display_name: string }>,
): TransferCandidate[] {
  const byEmail = new Map(
    serverCandidates.map((row) => [row.email.toLowerCase(), row] as const),
  );

  const merged: TransferCandidate[] = [];
  for (const member of familyTransferCandidates(familyMembers)) {
    const email = member.email!.trim().toLowerCase();
    const server = byEmail.get(email);
    if (!server) continue;
    merged.push({
      userId: server.user_id,
      email: server.email,
      displayName: member.displayName || server.display_name,
      memberId: member.id,
    });
  }

  return merged.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function fetchHouseholdTransferCandidates(): Promise<
  { ok: true; candidates: Array<{ user_id: string; email: string; display_name: string }> } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: true, candidates: [] };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const { data, error } = await supabase.rpc('list_household_transfer_candidates');
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    candidates: (data ?? []) as Array<{ user_id: string; email: string; display_name: string }>,
  };
}

export async function deleteHouseholdVaultOnServer(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const { error } = await supabase.rpc('delete_household_vault');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOwnerAccountOnServer(
  newOwnerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const { error } = await supabase.rpc('delete_owner_account', {
    new_owner_user_id: newOwnerUserId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
