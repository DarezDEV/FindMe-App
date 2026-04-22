-- RLS policies for user-owned cases and sightings.
-- Ajusta los nombres de columnas si tu esquema difiere.

-- CASES
alter table public.cases enable row level security;

drop policy if exists "cases_select_own" on public.cases;
create policy "cases_select_own"
on public.cases
for select
to authenticated
using (publicado_por = auth.uid());

drop policy if exists "cases_update_own" on public.cases;
create policy "cases_update_own"
on public.cases
for update
to authenticated
using (publicado_por = auth.uid())
with check (publicado_por = auth.uid());

-- CASE_SIGHTINGS
alter table public.case_sightings enable row level security;

drop policy if exists "case_sightings_select_own" on public.case_sightings;
create policy "case_sightings_select_own"
on public.case_sightings
for select
to authenticated
using (reportado_por = auth.uid());
