-- PreVault P1 fix: household RLS + bootstrap RPC
-- Run after 002_p1_households.sql if invite creation fails with "no household for owner"

-- Avoid recursive RLS when selecting household_members
drop policy if exists "household_members_select_member" on public.household_members;
drop policy if exists "household_members_select_own" on public.household_members;

create policy "household_members_select_own"
  on public.household_members for select
  using (user_id = auth.uid());

-- Allow owners to read their households even before membership row exists
drop policy if exists "households_select_member" on public.households;
drop policy if exists "households_select_owner_or_member" on public.households;

create policy "households_select_owner_or_member"
  on public.households for select
  using (
    owner_id = auth.uid()
    or public.is_household_member(id)
  );

-- Make helper bypass RLS (standard Supabase pattern)
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

-- RPC: idempotent household bootstrap for signed-in owner
create or replace function public.ensure_owner_household()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select h.id into hid
  from public.households h
  where h.owner_id = auth.uid()
  limit 1;

  if hid is not null then
    return hid;
  end if;

  insert into public.households (owner_id)
  values (auth.uid())
  returning id into hid;

  insert into public.household_members (household_id, user_id, role, status)
  values (hid, auth.uid(), 'owner', 'active')
  on conflict (household_id, user_id) do update
    set role = 'owner', status = 'active', updated_at = now();

  return hid;
end;
$$;

revoke all on function public.ensure_owner_household() from public;
grant execute on function public.ensure_owner_household() to authenticated;

-- Auto-bootstrap before invite creation
create or replace function public.create_household_invite(target_email text)
returns table(invite_id uuid, token text, household_id uuid, email text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  hid uuid;
  raw_token text;
  thash text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  hid := public.ensure_owner_household();

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  thash := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  insert into public.household_invites as hi (household_id, email, token_hash, created_by)
  values (hid, lower(trim(target_email)), thash, auth.uid())
  returning hi.id, raw_token, hi.household_id, hi.email, hi.expires_at
  into invite_id, token, household_id, email, expires_at;

  return next;
end;
$$;
