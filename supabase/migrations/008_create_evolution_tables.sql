-- ============================================================
-- Migration 008: Create evolution tracking tables
-- Stores progress photos, bioimpedance and body measurements
-- ============================================================

-- ────────────────────────────────────────────────────
-- APPOINTMENTS (legacy scheduler records)
-- ────────────────────────────────────────────────────
create table if not exists public.appointments (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  student_id   uuid references public.students(id) on delete cascade not null,
  date         date not null,
  time         text not null,
  duration     integer not null default 60,
  session_done boolean not null default false,
  muscle_groups text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.update_updated_at();

create index idx_appointments_user_date on public.appointments(user_id, date);
create index idx_appointments_student   on public.appointments(student_id);

-- ────────────────────────────────────────────────────
-- EVOLUTION PHOTOS
-- ────────────────────────────────────────────────────
create table if not exists public.evolution_photos (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date       date not null,
  front_url  text,
  side_url   text,
  back_url   text,
  created_at timestamptz not null default now()
);

create index idx_evolution_photos_student on public.evolution_photos(student_id, date);

-- ────────────────────────────────────────────────────
-- BIOIMPEDANCE
-- ────────────────────────────────────────────────────
create table if not exists public.bioimpedance (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  student_id     uuid references public.students(id) on delete cascade not null,
  date           date not null,
  image_url      text,
  weight         numeric(6,2) not null,
  body_fat_pct   numeric(5,2) not null,
  body_fat_kg    numeric(6,2) not null,
  muscle_mass    numeric(6,2) not null,
  visceral_fat   numeric(5,1) not null,
  lean_mass      numeric(6,2) not null,
  muscle_pct     numeric(5,2) not null,
  created_at     timestamptz not null default now()
);

create index idx_bioimpedance_student on public.bioimpedance(student_id, date);

-- ────────────────────────────────────────────────────
-- MEASUREMENTS
-- ────────────────────────────────────────────────────
create table if not exists public.measurements (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  student_id      uuid references public.students(id) on delete cascade not null,
  date            date not null,
  weight          numeric(6,2) not null,
  height          numeric(5,1) not null,
  chest           numeric(6,2) not null default 0,
  waist           numeric(6,2) not null default 0,
  hip             numeric(6,2) not null default 0,
  arm             numeric(6,2) not null default 0,
  thigh           numeric(6,2) not null default 0,
  calf            numeric(6,2) not null default 0,
  sf_triceps      numeric(5,2) not null default 0,
  sf_biceps       numeric(5,2) not null default 0,
  sf_subscapular  numeric(5,2) not null default 0,
  sf_suprailiac   numeric(5,2) not null default 0,
  sf_abdominal    numeric(5,2) not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_measurements_student on public.measurements(student_id, date);

-- ────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('evolution-photos', 'evolution-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bioimpedance-images', 'bioimpedance-images', false)
on conflict (id) do nothing;
