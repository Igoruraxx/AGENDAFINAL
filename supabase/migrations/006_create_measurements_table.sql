-- Migration 006: Create measurements table
-- Medidas corporais e dobras cutâneas dos alunos

create table if not exists public.measurements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null,
  weight numeric(6,2) not null,
  height numeric(5,1) not null,
  chest numeric(6,2) not null default 0,
  waist numeric(6,2) not null default 0,
  hip numeric(6,2) not null default 0,
  arm numeric(6,2) not null default 0,
  thigh numeric(6,2) not null default 0,
  calf numeric(6,2) not null default 0,
  sf_triceps numeric(5,2) not null default 0,
  sf_biceps numeric(5,2) not null default 0,
  sf_subscapular numeric(5,2) not null default 0,
  sf_suprailiac numeric(5,2) not null default 0,
  sf_abdominal numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_measurements_student on public.measurements(student_id, date);
create index if not exists idx_measurements_user on public.measurements(user_id);
