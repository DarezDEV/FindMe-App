-- Run this in Supabase SQL Editor (project owner/admin).
-- Grants authenticated users permission to insert media rows only for cases they created.

alter table public.caso_media enable row level security;

grant select on table public.caso_media to anon, authenticated;
grant insert, update, delete on table public.caso_media to authenticated;

drop policy if exists "caso_media read public" on public.caso_media;
drop policy if exists "caso_media insert own case" on public.caso_media;
drop policy if exists "caso_media update own case" on public.caso_media;
drop policy if exists "caso_media delete own case" on public.caso_media;

create policy "caso_media read public"
on public.caso_media
for select
to public
using (true);

create policy "caso_media insert own case"
on public.caso_media
for insert
to authenticated
with check (
  caso_media.subido_por = auth.uid()
  and
  exists (
    select 1
    from public.casos c
    where c.id = caso_media.caso_id
      and c.publicado_por = auth.uid()
  )
);

create policy "caso_media update own case"
on public.caso_media
for update
to authenticated
using (
  caso_media.subido_por = auth.uid()
  and
  exists (
    select 1
    from public.casos c
    where c.id = caso_media.caso_id
      and c.publicado_por = auth.uid()
  )
)
with check (
  caso_media.subido_por = auth.uid()
  and
  exists (
    select 1
    from public.casos c
    where c.id = caso_media.caso_id
      and c.publicado_por = auth.uid()
  )
);

create policy "caso_media delete own case"
on public.caso_media
for delete
to authenticated
using (
  caso_media.subido_por = auth.uid()
  and
  exists (
    select 1
    from public.casos c
    where c.id = caso_media.caso_id
      and c.publicado_por = auth.uid()
  )
);
