-- PreVault P4: server launch cohort cap + per-member document cap (run after 005_p3_storage.sql)

-- App-wide limits (no client RLS — read via security definer functions only)
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

insert into public.app_config (key, value)
values
  ('launch_cohort_max_users', '100'),
  ('max_docs_per_member', '50')
on conflict (key) do nothing;

create or replace function public.app_config_int(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif(trim(value), '')::int
      from public.app_config
      where key = p_key
    ),
    p_default
  );
$$;

-- Launch cohort: assign slot atomically on profile insert (user 101+ stays free)
create or replace function public.profiles_assign_launch_cohort()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cohort_count int;
  max_users int;
begin
  perform pg_advisory_xact_lock(42424242);

  max_users := public.app_config_int('launch_cohort_max_users', 100);

  select count(*)::int into cohort_count
  from public.profiles
  where launch_cohort = true;

  if cohort_count < max_users then
    new.launch_cohort := true;
    new.launch_cohort_number := cohort_count + 1;
  else
    new.launch_cohort := false;
    new.launch_cohort_number := null;
    new.plan := 'free';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_assign_launch_cohort on public.profiles;
create trigger profiles_assign_launch_cohort
  before insert on public.profiles
  for each row
  execute function public.profiles_assign_launch_cohort();

create or replace function public.launch_cohort_signup_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.profiles where launch_cohort = true;
$$;

revoke all on function public.launch_cohort_signup_count() from public;
grant execute on function public.launch_cohort_signup_count() to authenticated;

-- Document cap: 50 active docs per member_id within a household
create or replace function public.resolve_document_member_id(
  p_member_id text,
  p_owner_member_id text
)
returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(p_member_id), ''), nullif(trim(p_owner_member_id), ''));
$$;

create or replace function public.enforce_member_document_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_key text;
  cap int;
  current_count int;
begin
  if TG_OP = 'UPDATE' and old.archived_at is null and new.archived_at is not null then
    return new;
  end if;

  if new.archived_at is not null then
    return new;
  end if;

  member_key := public.resolve_document_member_id(new.member_id, new.owner_member_id);
  if member_key is null then
    return new;
  end if;

  cap := public.app_config_int('max_docs_per_member', 50);

  select count(*)::int into current_count
  from public.documents d
  where d.household_id = new.household_id
    and d.archived_at is null
    and public.resolve_document_member_id(d.member_id, d.owner_member_id) = member_key
    and (TG_OP = 'INSERT' or d.id <> new.id);

  if current_count >= cap then
    raise exception 'member_document_cap_reached'
      using detail = format('member %s at cap %s', member_key, cap);
  end if;

  return new;
end;
$$;

drop trigger if exists documents_enforce_member_cap on public.documents;
create trigger documents_enforce_member_cap
  before insert or update on public.documents
  for each row
  execute function public.enforce_member_document_cap();

-- Link share grants when invitee joins (optional client member id on join link)
create or replace function public.accept_household_invite(
  invite_token text,
  grantee_member_id text default null
)
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

  if grantee_member_id is not null and trim(grantee_member_id) <> '' then
    update public.share_grants sg
    set grantee_user_id = auth.uid()
    where sg.household_id = inv.household_id
      and sg.grantee_member_id = trim(grantee_member_id)
      and (sg.grantee_user_id is null or sg.grantee_user_id = auth.uid());
  end if;

  household_id := inv.household_id;
  user_id := auth.uid();
  role := 'viewer';
  return next;
end;
$$;

revoke all on function public.accept_household_invite(text, text) from public;
grant execute on function public.accept_household_invite(text, text) to authenticated;
