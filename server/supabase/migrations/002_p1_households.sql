-- PreVault P1: households + membership + email invites (run in Supabase SQL editor per environment)

create extension if not exists pgcrypto with schema extensions;

-- Households: one or more users per household.
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists households_owner_idx on public.households (owner_id);

-- Household members: links auth users to a household.
create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'viewer')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx on public.household_members (user_id);

-- Email invites: created by an owner; accepted by an authenticated user with matching email.
create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists household_invites_household_idx on public.household_invites (household_id);
create index if not exists household_invites_email_idx on public.household_invites (email);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

-- Helper: is current user a member of household?
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

-- Households policies
create policy "households_select_member"
  on public.households for select
  using (public.is_household_member(id));

create policy "households_insert_owner"
  on public.households for insert
  with check (auth.uid() = owner_id);

create policy "households_update_owner"
  on public.households for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Household members policies
create policy "household_members_select_member"
  on public.household_members for select
  using (public.is_household_member(household_id));

create policy "household_members_insert_owner_self"
  on public.household_members for insert
  with check (
    -- household owner can add members
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
    -- or owner adding themselves at bootstrap
    or user_id = auth.uid()
  );

create policy "household_members_update_owner"
  on public.household_members for update
  using (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

-- Invites policies (owners can view/create; invite acceptance happens via RPC)
create policy "household_invites_select_owner"
  on public.household_invites for select
  using (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

create policy "household_invites_insert_owner"
  on public.household_invites for insert
  with check (
    auth.uid() = created_by and exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

create policy "household_invites_update_owner"
  on public.household_invites for update
  using (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

-- RPC: create an invite (returns raw token once; only the owner can create)
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
  -- caller must be authenticated
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- find a household where caller is the owner
  select h.id into hid
  from public.households h
  where h.owner_id = auth.uid()
  limit 1;

  if hid is null then
    raise exception 'no household for owner';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  thash := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  insert into public.household_invites as hi (household_id, email, token_hash, created_by)
  values (hid, lower(trim(target_email)), thash, auth.uid())
  returning hi.id, raw_token, hi.household_id, hi.email, hi.expires_at
  into invite_id, token, household_id, email, expires_at;

  return next;
end;
$$;

revoke all on function public.create_household_invite(text) from public;
grant execute on function public.create_household_invite(text) to authenticated;

-- RPC: accept an invite token; email must match auth email
create or replace function public.accept_household_invite(invite_token text)
returns table(household_id uuid, user_id uuid, role text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inv record;
  thash text;
  jwt_email text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  jwt_email := lower(trim(auth.jwt() ->> 'email'));
  if jwt_email is null or jwt_email = '' then
    raise exception 'email missing from auth token';
  end if;

  thash := encode(extensions.digest(invite_token, 'sha256'), 'hex');

  select * into inv
  from public.household_invites i
  where i.token_hash = thash
    and i.revoked_at is null
    and i.accepted_at is null
    and i.expires_at > now()
  limit 1;

  if inv is null then
    raise exception 'invite invalid or expired';
  end if;

  if lower(inv.email) <> jwt_email then
    raise exception 'invite email does not match signed-in email';
  end if;

  insert into public.household_members (household_id, user_id, role, status)
  values (inv.household_id, auth.uid(), 'viewer', 'active')
  on conflict (household_id, user_id) do update
    set status = 'active', updated_at = now();

  update public.household_invites
    set accepted_by = auth.uid(),
        accepted_at = now()
    where id = inv.id;

  household_id := inv.household_id;
  user_id := auth.uid();
  role := 'viewer';
  return next;
end;
$$;

revoke all on function public.accept_household_invite(text) from public;
grant execute on function public.accept_household_invite(text) to authenticated;

