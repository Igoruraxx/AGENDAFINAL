-- ============================================================
-- Migration 006: Create students table
-- Students managed by each personal trainer user
-- ============================================================

-- ────────────────────────────────────────────────────
-- STUDENTS
-- ────────────────────────────────────────────────────
create table if not exists public.students (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references public.profiles(id) on delete cascade not null,
  name              text not null,
  phone             text not null default '',
  plan              text not null default 'monthly'
                      check (plan in ('monthly', 'session', 'long_term')),
  plan_duration     integer,
  value             numeric(10,2) not null default 0,
  total_value       numeric(10,2),
  weekly_frequency  integer not null default 1,
  selected_days     text[] not null default '{}',
  selected_times    text[] not null default '{}',
  is_consulting     boolean not null default false,
  is_active         boolean not null default true,
  billing_day       integer
                      check (billing_day is null or (billing_day >= 1 and billing_day <= 31)),
  next_billing_date date,
  share_token       uuid default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-update updated_at
create trigger students_updated_at
  before update on public.students
  for each row execute function public.update_updated_at();

-- Performance index
create index idx_students_user_id on public.students(user_id);
