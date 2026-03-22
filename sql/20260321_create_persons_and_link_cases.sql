create extension if not exists pgcrypto;

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  nombres text not null,
  apellidos text not null,
  genero text,
  edad integer,
  created_at timestamptz not null default now()
);

create index if not exists persons_name_idx on public.persons (nombres, apellidos);

alter table public.cases
  add column if not exists person_id uuid references public.persons(id);

create index if not exists cases_person_id_idx on public.cases (person_id);
