-- Migration 005: Create bioimpedance table
-- Análise de composição corporal (bioimpedância)

create table if not exists public.bioimpedance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null,
  image_url text,
  weight numeric(6,2) not null,
  body_fat_pct numeric(5,2) not null,
  body_fat_kg numeric(6,2) not null,
  muscle_mass numeric(6,2) not null,
  visceral_fat numeric(5,1) not null,
  lean_mass numeric(6,2) not null,
  muscle_pct numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bioimpedance_student on public.bioimpedance(student_id, date);
create index if not exists idx_bioimpedance_user on public.bioimpedance(user_id);
