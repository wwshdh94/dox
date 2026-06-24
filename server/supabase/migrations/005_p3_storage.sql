-- PreVault P3: encrypted document Storage + policies (run after 004_p2_documents_acl.sql)

insert into storage.buckets (id, name, public, file_size_limit)
values ('household-documents', 'household-documents', false, 52428800)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Storage RLS mirrors document ACL via documents.storage_path
drop policy if exists "household_docs_select" on storage.objects;
create policy "household_docs_select"
  on storage.objects for select
  using (
    bucket_id = 'household-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and public.user_can_read_document(d.*)
    )
  );

drop policy if exists "household_docs_insert" on storage.objects;
create policy "household_docs_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'household-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and public.user_can_manage_document(d.*)
    )
  );

drop policy if exists "household_docs_update" on storage.objects;
create policy "household_docs_update"
  on storage.objects for update
  using (
    bucket_id = 'household-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and public.user_can_manage_document(d.*)
    )
  )
  with check (
    bucket_id = 'household-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and public.user_can_manage_document(d.*)
    )
  );

drop policy if exists "household_docs_delete" on storage.objects;
create policy "household_docs_delete"
  on storage.objects for delete
  using (
    bucket_id = 'household-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and public.user_can_manage_document(d.*)
    )
  );
