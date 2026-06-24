-- PreVault P5: owner account lifecycle — transfer ownership, delete vault, delete account
-- Run after 006_p4_launch_cohort_and_limits.sql

-- Household id for the signed-in owner (null if not owner)
create or replace function public.owner_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select h.id
  from public.households h
  where h.owner_id = auth.uid()
  limit 1;
$$;

revoke all on function public.owner_household_id() from public;
grant execute on function public.owner_household_id() to authenticated;

-- Active household members who can receive vault ownership (excludes caller)
create or replace function public.list_household_transfer_candidates()
returns table(user_id uuid, email text, display_name text)
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

  hid := public.owner_household_id();
  if hid is null then
    raise exception 'not household owner';
  end if;

  return query
  select hm.user_id, p.email::text, coalesce(p.display_name, p.email)::text
  from public.household_members hm
  inner join public.profiles p on p.id = hm.user_id
  where hm.household_id = hid
    and hm.status = 'active'
    and hm.user_id <> auth.uid();
end;
$$;

revoke all on function public.list_household_transfer_candidates() from public;
grant execute on function public.list_household_transfer_candidates() to authenticated;

-- Transfer household ownership to another active member
create or replace function public.transfer_household_ownership(new_owner_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  caller uuid;
begin
  caller := auth.uid();
  if caller is null then
    raise exception 'not authenticated';
  end if;

  if new_owner_user_id is null or new_owner_user_id = caller then
    raise exception 'invalid new owner';
  end if;

  hid := public.owner_household_id();
  if hid is null then
    raise exception 'not household owner';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = new_owner_user_id
      and hm.status = 'active'
  ) then
    raise exception 'new owner is not an active household member';
  end if;

  update public.households
    set owner_id = new_owner_user_id,
        updated_at = now()
    where id = hid;

  update public.household_members
    set role = 'viewer',
        updated_at = now()
    where household_id = hid
      and user_id = caller;

  update public.household_members
    set role = 'owner',
        updated_at = now()
    where household_id = hid
      and user_id = new_owner_user_id;

  return hid;
end;
$$;

revoke all on function public.transfer_household_ownership(uuid) from public;
grant execute on function public.transfer_household_ownership(uuid) to authenticated;

-- Permanently delete household vault: files, documents, members metadata, invites
create or replace function public.delete_household_vault()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  hid := public.owner_household_id();
  if hid is null then
    raise exception 'not household owner';
  end if;

  delete from storage.objects
  where bucket_id = 'household-documents'
    and name like hid::text || '/%';

  delete from public.households where id = hid;
end;
$$;

revoke all on function public.delete_household_vault() from public;
grant execute on function public.delete_household_vault() to authenticated;

-- Transfer ownership, leave household, delete auth user + profile (cascade)
create or replace function public.delete_owner_account(new_owner_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller uuid;
  hid uuid;
begin
  caller := auth.uid();
  if caller is null then
    raise exception 'not authenticated';
  end if;

  if new_owner_user_id is null or new_owner_user_id = caller then
    raise exception 'invalid new owner';
  end if;

  perform public.transfer_household_ownership(new_owner_user_id);

  select hm.household_id into hid
  from public.household_members hm
  where hm.user_id = caller
    and hm.status = 'active'
  limit 1;

  if hid is not null then
    delete from public.household_members
    where household_id = hid
      and user_id = caller;
  end if;

  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_owner_account(uuid) from public;
grant execute on function public.delete_owner_account(uuid) to authenticated;
