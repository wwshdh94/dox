-- PreVault P2: documents metadata + share_grants + RLS (run after 003_p1_households_rls_fix.sql)

-- Document metadata (family domain server sync; file blobs in P3 Storage)
create table if not exists public.documents (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  owner_member_id text,
  title text not null,
  doc_type text not null,
  domain text not null default 'family' check (domain in ('family', 'health', 'assets')),
  category text,
  member_id text,
  asset_id text,
  expiry_date date,
  review_status text not null default 'under_review'
    check (review_status in ('processing', 'under_review', 'reviewed', 'rejected')),
  fields jsonb not null default '{}'::jsonb,
  notes text,
  file_name text,
  storage_path text,
  archived_at timestamptz,
  renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_household_idx on public.documents (household_id);
create index if not exists documents_created_by_idx on public.documents (created_by);

-- Family share grants (mirrors client shareGrants; grantee_user_id set when member has joined)
create table if not exists public.share_grants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  grantee_member_id text not null,
  grantee_user_id uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (document_id, grantee_member_id)
);

create index if not exists share_grants_household_idx on public.share_grants (household_id);
create index if not exists share_grants_document_idx on public.share_grants (document_id);
create index if not exists share_grants_grantee_user_idx on public.share_grants (grantee_user_id);

alter table public.documents enable row level security;
alter table public.share_grants enable row level security;

-- Is caller the household owner?
create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.households h
    where h.id = hid and h.owner_id = auth.uid()
  );
$$;

-- Can caller read this document? Mirrors core server-side ACL for joined accounts.
create or replace function public.user_can_read_document(doc public.documents)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_household_member(doc.household_id)
    and doc.archived_at is null
    and (
      doc.created_by = auth.uid()
      or public.is_household_owner(doc.household_id)
      or exists (
        select 1 from public.share_grants sg
        where sg.document_id = doc.id
          and sg.grantee_user_id = auth.uid()
      )
    );
$$;

-- Can caller manage this document metadata?
create or replace function public.user_can_manage_document(doc public.documents)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_household_member(doc.household_id)
    and (
      doc.created_by = auth.uid()
      or public.is_household_owner(doc.household_id)
    );
$$;

-- Documents policies
drop policy if exists "documents_select_readable" on public.documents;
create policy "documents_select_readable"
  on public.documents for select
  using (public.user_can_read_document(documents.*));

drop policy if exists "documents_insert_member" on public.documents;
create policy "documents_insert_member"
  on public.documents for insert
  with check (
    public.is_household_member(household_id)
    and created_by = auth.uid()
  );

drop policy if exists "documents_update_manager" on public.documents;
create policy "documents_update_manager"
  on public.documents for update
  using (public.user_can_manage_document(documents.*))
  with check (public.user_can_manage_document(documents.*));

drop policy if exists "documents_delete_manager" on public.documents;
create policy "documents_delete_manager"
  on public.documents for delete
  using (public.user_can_manage_document(documents.*));

-- Share grants policies
drop policy if exists "share_grants_select_member" on public.share_grants;
create policy "share_grants_select_member"
  on public.share_grants for select
  using (public.is_household_member(household_id));

drop policy if exists "share_grants_insert_manager" on public.share_grants;
create policy "share_grants_insert_manager"
  on public.share_grants for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and public.user_can_manage_document(d.*)
    )
  );

drop policy if exists "share_grants_delete_manager" on public.share_grants;
create policy "share_grants_delete_manager"
  on public.share_grants for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and public.user_can_manage_document(d.*)
    )
  );

-- Resolve auth user id for a household member email (for grantee_user_id on share)
create or replace function public.resolve_household_member_user_id(target_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  resolved uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select hm.household_id into hid
  from public.household_members hm
  where hm.user_id = auth.uid()
    and hm.status = 'active'
  limit 1;

  if hid is null then
    return null;
  end if;

  select p.id into resolved
  from public.profiles p
  inner join public.household_members hm on hm.user_id = p.id
  where hm.household_id = hid
    and hm.status = 'active'
    and lower(p.email) = lower(trim(target_email))
  limit 1;

  return resolved;
end;
$$;

revoke all on function public.resolve_household_member_user_id(text) from public;
grant execute on function public.resolve_household_member_user_id(text) to authenticated;
