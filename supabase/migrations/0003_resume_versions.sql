alter table public.resumes
  add column if not exists pdf_path text,
  add column if not exists file_size integer not null default 0,
  add column if not exists page_count integer not null default 0,
  add column if not exists structured_content jsonb not null default '{}'::jsonb;

create unique index if not exists idx_resumes_user_version
  on public.resumes(user_id, version);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resume-pdfs', 'resume-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users_read_own_resume_pdfs" on storage.objects;
create policy "users_read_own_resume_pdfs"
on storage.objects for select
using (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users_upload_own_resume_pdfs" on storage.objects;
create policy "users_upload_own_resume_pdfs"
on storage.objects for insert
with check (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users_update_own_resume_pdfs" on storage.objects;
create policy "users_update_own_resume_pdfs"
on storage.objects for update
using (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users_delete_own_resume_pdfs" on storage.objects;
create policy "users_delete_own_resume_pdfs"
on storage.objects for delete
using (
  bucket_id = 'resume-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
