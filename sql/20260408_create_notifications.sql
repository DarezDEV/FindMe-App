-- Notifications system (table + RLS + triggers)
create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Ensure old rows are available on UPDATE/DELETE in realtime payloads
alter table public.notifications replica identity full;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_insert_self" on public.notifications;
create policy "notifications_insert_self"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid());

-- Trigger: cases workflow changes / deletions -> notify case owner
create or replace function public.notify_case_workflow_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row jsonb;
  old_row jsonb;
  recipient uuid;
  case_id text;
  case_number text;
  full_name text;
  old_workflow text;
  new_workflow text;
  old_deleted boolean;
  new_deleted boolean;
  notif_type text;
  notif_title text;
  notif_message text;
begin
  new_row := to_jsonb(new);
  old_row := to_jsonb(old);

  recipient := nullif(coalesce(new_row->>'publicado_por', new_row->>'user_id', new_row->>'autor_id'), '')::uuid;
  if recipient is null then
    return new;
  end if;

  case_id := nullif(new_row->>'id', '');
  case_number := coalesce(nullif(new_row->>'numero_caso', ''), 'Tu caso');
  full_name := trim(coalesce(new_row->>'nombres', '') || ' ' || coalesce(new_row->>'apellidos', ''));

  old_workflow := nullif(old_row->>'workflow_status', '');
  new_workflow := nullif(new_row->>'workflow_status', '');

  if old_workflow is distinct from new_workflow and new_workflow is not null then
    if new_workflow = 'approved' then
      notif_type := 'case_approved';
      notif_title := 'Caso aprobado';
      notif_message := case
        when full_name <> '' then format('Tu caso %s (%s) fue aprobado y publicado.', case_number, full_name)
        else format('Tu caso %s fue aprobado y publicado.', case_number)
      end;
    elsif new_workflow = 'rejected' then
      notif_type := 'case_rejected';
      notif_title := 'Caso rechazado';
      notif_message := case
        when full_name <> '' then format('Tu caso %s (%s) fue rechazado. Puedes corregir la información y reintentar.', case_number, full_name)
        else format('Tu caso %s fue rechazado. Puedes corregir la información y reintentar.', case_number)
      end;
    elsif new_workflow = 'found' then
      notif_type := 'case_found';
      notif_title := 'Caso reunificado';
      notif_message := case
        when full_name <> '' then format('El caso %s (%s) fue marcado como encontrado.', case_number, full_name)
        else format('El caso %s fue marcado como encontrado.', case_number)
      end;
    elsif new_workflow = 'closed' then
      notif_type := 'case_closed';
      notif_title := 'Caso archivado';
      notif_message := case
        when full_name <> '' then format('El caso %s (%s) fue archivado.', case_number, full_name)
        else format('El caso %s fue archivado.', case_number)
      end;
    else
      return new;
    end if;

    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      recipient,
      notif_type,
      notif_title,
      notif_message,
      jsonb_build_object(
        'case_id', case_id,
        'numero_caso', nullif(new_row->>'numero_caso', ''),
        'workflow_status', new_workflow,
        'status', nullif(new_row->>'status', ''),
        'actor_id', auth.uid(),
        'source', tg_table_name
      )
    );

    return new;
  end if;

  old_deleted := (old_row->>'eliminado')::boolean;
  new_deleted := (new_row->>'eliminado')::boolean;

  if old_deleted is distinct from new_deleted and new_deleted = true then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      recipient,
      'case_deleted',
      'Caso eliminado',
      case
        when full_name <> '' then format('El caso %s (%s) fue eliminado por el sistema.', case_number, full_name)
        else format('El caso %s fue eliminado por el sistema.', case_number)
      end,
      jsonb_build_object(
        'case_id', case_id,
        'numero_caso', nullif(new_row->>'numero_caso', ''),
        'actor_id', auth.uid(),
        'source', tg_table_name
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_case_workflow_update on public.cases;
create trigger trg_notify_case_workflow_update
after update on public.cases
for each row
execute function public.notify_case_workflow_update();

-- Trigger: sightings created -> notify owner + authorities/admins
create or replace function public.notify_sighting_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row jsonb;
  case_id uuid;
  sighting_id text;
  reporter uuid;
  recipient uuid;
  case_number text;
  location_text text;
begin
  new_row := to_jsonb(new);

  case_id := coalesce(
    nullif(new_row->>'caso_id', '')::uuid,
    nullif(new_row->>'case_id', '')::uuid,
    nullif(new_row->>'missing_case_id', '')::uuid
  );

  if case_id is null then
    return new;
  end if;

  select c.publicado_por, c.numero_caso
    into recipient, case_number
  from public.cases c
  where c.id = case_id;

  case_number := coalesce(case_number, 'Caso');
  sighting_id := coalesce(nullif(new_row->>'id', ''), nullif(new_row->>'avistamiento_id', ''));

  reporter := coalesce(
    nullif(new_row->>'reportado_por', '')::uuid,
    nullif(new_row->>'user_id', '')::uuid,
    nullif(new_row->>'autor_id', '')::uuid,
    nullif(new_row->>'created_by', '')::uuid
  );

  location_text := nullif(trim(coalesce(
    new_row->>'lugar',
    new_row->>'ubicacion',
    new_row->>'location',
    new_row->>'direccion',
    new_row->>'ciudad',
    ''
  )), '');

  if recipient is not null then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      recipient,
      'sighting_created',
      'Nuevo avistamiento',
      case
        when location_text is not null then format('Se reportó un avistamiento para %s en %s.', case_number, location_text)
        else format('Se reportó un avistamiento para %s.', case_number)
      end,
      jsonb_build_object(
        'case_id', case_id::text,
        'sighting_id', sighting_id,
        'numero_caso', case_number,
        'lugar', location_text,
        'reportado_por', reporter,
        'actor_id', auth.uid(),
        'source', tg_table_name
      )
    );
  end if;

  insert into public.notifications (user_id, type, title, message, metadata)
  select
    ur.user_id,
    'sighting_created',
    'Avistamiento reportado',
    case
      when location_text is not null then format('Avistamiento reportado en %s para %s.', location_text, case_number)
      else format('Avistamiento reportado para %s.', case_number)
    end,
    jsonb_build_object(
      'case_id', case_id::text,
      'sighting_id', sighting_id,
      'numero_caso', case_number,
      'lugar', location_text,
      'reportado_por', reporter,
      'actor_id', auth.uid(),
      'source', tg_table_name
    )
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name in ('authority', 'admin')
    and (recipient is null or ur.user_id <> recipient);

  return new;
end;
$$;

drop trigger if exists trg_notify_sighting_created on public.case_sightings;
create trigger trg_notify_sighting_created
after insert on public.case_sightings
for each row
execute function public.notify_sighting_created();

-- Trigger: admin activates/deactivates a user
create or replace function public.notify_profile_activo_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row jsonb;
  old_row jsonb;
  profile_id uuid;
  old_activo boolean;
  new_activo boolean;
begin
  new_row := to_jsonb(new);
  old_row := to_jsonb(old);

  profile_id := nullif(new_row->>'id', '')::uuid;
  old_activo := (old_row->>'activo')::boolean;
  new_activo := (new_row->>'activo')::boolean;

  if profile_id is not null and old_activo is distinct from new_activo then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      profile_id,
      'account_status_changed',
      case when new_activo then 'Cuenta activada' else 'Cuenta desactivada' end,
      case
        when new_activo then 'Un administrador activó tu cuenta. Ya puedes acceder a la plataforma.'
        else 'Un administrador desactivó tu cuenta. Si crees que es un error, contacta al soporte.'
      end,
      jsonb_build_object(
        'profile_id', profile_id::text,
        'activo', new_activo,
        'actor_id', auth.uid(),
        'source', tg_table_name
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_profile_activo_change on public.profiles;
create trigger trg_notify_profile_activo_change
after update on public.profiles
for each row
execute function public.notify_profile_activo_change();

-- Enable realtime replication for notifications (safe-guarded)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;

-- Hardening: these SECURITY DEFINER functions must not be callable directly by end-users.
revoke execute on function public.notify_case_workflow_update() from public;
revoke execute on function public.notify_sighting_created() from public;
revoke execute on function public.notify_profile_activo_change() from public;
