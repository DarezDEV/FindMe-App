create extension if not exists pgcrypto;

create table if not exists public.cases_closed (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  closed_by uuid references public.profiles(id),
  closed_note text not null,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists cases_closed_case_id_key on public.cases_closed (case_id);
create index if not exists cases_closed_closed_by_idx on public.cases_closed (closed_by);
create index if not exists cases_closed_closed_at_idx on public.cases_closed (closed_at);
