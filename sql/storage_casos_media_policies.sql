-- Run this in Supabase SQL Editor (project owner/admin).
-- It creates/updates the `casos-media` bucket and grants upload/read permissions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'casos-media',
  'casos-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "casos-media read" on storage.objects;
drop policy if exists "casos-media upload authenticated" on storage.objects;
drop policy if exists "casos-media update own objects" on storage.objects;
drop policy if exists "casos-media delete own objects" on storage.objects;

create policy "casos-media read"
on storage.objects
for select
to public
using (bucket_id = 'casos-media');

create policy "casos-media upload authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'casos-media'
  and (storage.foldername(name))[1] = 'cases'
);

create policy "casos-media update own objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'casos-media'
  and owner = auth.uid()
)
with check (
  bucket_id = 'casos-media'
  and owner = auth.uid()
);

create policy "casos-media delete own objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'casos-media'
  and owner = auth.uid()
);
