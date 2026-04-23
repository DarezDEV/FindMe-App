-- Adds workflow_status to cases for dynamic moderation state.
-- Run this in Supabase SQL editor.

do $$
declare
  target_table text;
  constraint_name text;
  index_name text;
begin
  if to_regclass('public.cases') is not null then
    target_table := 'public.cases';
    constraint_name := 'cases_workflow_status_check';
    index_name := 'cases_workflow_status_idx';
  elsif to_regclass('public.casos') is not null then
    target_table := 'public.casos';
    constraint_name := 'casos_workflow_status_check';
    index_name := 'casos_workflow_status_idx';
  else
    raise exception 'No se encontro tabla cases ni casos en el esquema public.';
  end if;

  execute format('alter table %s add column if not exists workflow_status text null', target_table);
  execute format('alter table %s alter column workflow_status set default %L', target_table, 'pending');
  execute format('update %s set workflow_status = coalesce(workflow_status, %L)', target_table, 'pending');

  if not exists (
    select 1
    from pg_constraint
    where conname = constraint_name
  ) then
    execute format(
      'alter table %s add constraint %I check (workflow_status in (''pending'',''approved'',''rejected'',''found'',''closed''))',
      target_table,
      constraint_name
    );
  end if;

  execute format('create index if not exists %I on %s (workflow_status)', index_name, target_table);
end $$;
