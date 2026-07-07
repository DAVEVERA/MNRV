-- Public website intake submissions.
-- Run this in the Supabase SQL editor for project tulvzbzjbwxtjnaengwa.
-- This allows anonymous visitors to create intake rows and upload files only
-- inside the two intake buckets. It does not allow public reads, updates, or deletes.

alter table public.website_intakes enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.website_intakes to anon, authenticated;
grant usage on schema storage to anon, authenticated;
grant insert on table storage.objects to anon, authenticated;

drop policy if exists "Public can create website intakes" on public.website_intakes;
create policy "Public can create website intakes"
on public.website_intakes
for insert
to anon, authenticated
with check (true);

-- Storage upload policies for the optional intake file fields.
-- These expect existing public/private buckets named:
--   intake-context
--   intake-content

drop policy if exists "Public can upload intake context files" on storage.objects;
create policy "Public can upload intake context files"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'intake-context'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

drop policy if exists "Public can upload intake content files" on storage.objects;
create policy "Public can upload intake content files"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'intake-content'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
