import { getSupabase } from '@/lib/supabase/client';

export interface HouseholdRow {
  id: string;
  owner_id: string;
  name: string | null;
}

export interface HouseholdMemberRow {
  household_id: string;
  user_id: string;
  role: 'owner' | 'viewer';
  status: 'active' | 'disabled';
}

export async function getMyHouseholdId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  if (error) return null;
  const row = (data?.[0] ?? null) as { household_id: string } | null;
  return row?.household_id ?? null;
}

export async function getMyOwnedHouseholdId(userId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);

  if (error) return null;
  const row = (data?.[0] ?? null) as { id: string } | null;
  return row?.id ?? null;
}

/**
 * Ensure the signed-in user belongs to a household.
 * If none exists, create a new household and add the user as owner.
 */
export async function ensureHouseholdForUser(userId: string): Promise<
  | { ok: true; householdId: string; created: boolean }
  | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const existing = await getMyOwnedHouseholdId(userId);
  if (existing) return { ok: true, householdId: existing, created: false };

  const { data: rpcHouseholdId, error: rpcError } = await supabase.rpc('ensure_owner_household');
  if (!rpcError && rpcHouseholdId) {
    return { ok: true, householdId: rpcHouseholdId as string, created: true };
  }

  const { data: createdHousehold, error: createHouseholdError } = await supabase
    .from('households')
    .insert({ owner_id: userId })
    .select('id')
    .single();

  if (createHouseholdError || !createdHousehold?.id) {
    return { ok: false, error: createHouseholdError?.message ?? 'Could not create household' };
  }

  const householdId = createdHousehold.id as string;

  const { error: createMemberError } = await supabase.from('household_members').insert({
    household_id: householdId,
    user_id: userId,
    role: 'owner',
    status: 'active',
  });

  if (createMemberError) {
    return { ok: false, error: createMemberError.message };
  }

  return { ok: true, householdId, created: true };
}

export async function createHouseholdInvite(targetEmail: string): Promise<
  | { ok: true; inviteToken: string; inviteId: string; householdId: string; expiresAt: string }
  | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: userError?.message ?? 'Not signed in' };
  }

  const household = await ensureHouseholdForUser(user.id);
  if (!household.ok) {
    return { ok: false, error: household.error };
  }

  const { data, error } = await supabase.rpc('create_household_invite', {
    target_email: targetEmail,
  });

  if (error || !data?.[0]) {
    return { ok: false, error: error?.message ?? 'Could not create invite' };
  }

  const row = data[0] as {
    invite_id: string;
    token: string;
    household_id: string;
    expires_at: string;
  };

  return {
    ok: true,
    inviteToken: row.token,
    inviteId: row.invite_id,
    householdId: row.household_id,
    expiresAt: row.expires_at,
  };
}

export async function acceptHouseholdInvite(
  inviteToken: string,
  granteeMemberId?: string,
): Promise<{ ok: true; householdId: string } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const { data, error } = await supabase.rpc('accept_household_invite', {
    invite_token: inviteToken,
    grantee_member_id: granteeMemberId?.trim() || null,
  });

  if (error || !data?.[0]?.household_id) {
    return { ok: false, error: error?.message ?? 'Invite acceptance failed' };
  }

  return { ok: true, householdId: (data[0] as { household_id: string }).household_id };
}

