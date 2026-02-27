-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FITPRO AGENDA PERSONAL — Supabase Database Schema        ║
-- ║  Execute este SQL no Supabase Dashboard → SQL Editor       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  phone text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  is_admin boolean not null default false,
  notifications_enabled boolean not null default true,
  notify_before boolean not null default true,
  notify_at_time boolean not null default true,
  daily_list_time text not null default '08:00',
  subscription_end_date date,
  subscription_origin text check (subscription_origin in ('trial', 'courtesy', 'paid')),
  subscription_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- ────────────────────────────────────────────────────
-- 2. STUDENTS
-- ────────────────────────────────────────────────────
create table if not exists public.students (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  phone text not null default '',
  plan text not null default 'monthly' check (plan in ('monthly', 'session', 'long_term')),
  plan_duration integer,
  value numeric(10,2) not null default 0,
  total_value numeric(10,2),
  weekly_frequency integer not null default 1,
  selected_days text[] not null default '{}',
  selected_times text[] not null default '{}',
  is_consulting boolean not null default false,
  is_active boolean not null default true,
  billing_day integer check (billing_day is null or (billing_day >= 1 and billing_day <= 31)),
  next_billing_date date,
  share_token uuid default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "Users can manage own students"
  on public.students for all using (auth.uid() = user_id);

create trigger students_updated_at
  before update on public.students
  for each row execute function public.update_updated_at();

create index idx_students_user_id on public.students(user_id);

-- ────────────────────────────────────────────────────
-- 3. APPOINTMENTS
-- ────────────────────────────────────────────────────
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null,
  time text not null,
  duration integer not null default 60,
  session_done boolean not null default false,
  muscle_groups text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Users can manage own appointments"
  on public.appointments for all using (auth.uid() = user_id);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.update_updated_at();

create index idx_appointments_user_date on public.appointments(user_id, date);
create index idx_appointments_student on public.appointments(student_id);

-- ────────────────────────────────────────────────────
-- 4. EVOLUTION PHOTOS
-- ────────────────────────────────────────────────────
create table if not exists public.evolution_photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null,
  front_url text,
  side_url text,
  back_url text,
  created_at timestamptz not null default now()
);

alter table public.evolution_photos enable row level security;

create policy "Users can manage own evolution photos"
  on public.evolution_photos for all using (auth.uid() = user_id);

create index idx_evolution_photos_student on public.evolution_photos(student_id, date);

-- ────────────────────────────────────────────────────
-- 5. BIOIMPEDANCE
-- ────────────────────────────────────────────────────
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

alter table public.bioimpedance enable row level security;

create policy "Users can manage own bioimpedance"
  on public.bioimpedance for all using (auth.uid() = user_id);

create index idx_bioimpedance_student on public.bioimpedance(student_id, date);

-- ────────────────────────────────────────────────────
-- 6. MEASUREMENTS
-- ────────────────────────────────────────────────────
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

alter table public.measurements enable row level security;

create policy "Users can manage own measurements"
  on public.measurements for all using (auth.uid() = user_id);

create index idx_measurements_student on public.measurements(student_id, date);

-- ────────────────────────────────────────────────────
-- 7. PAYMENTS
-- ────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  amount numeric(10,2) not null,
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  month_ref text not null, -- formato: '2024-01'
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can manage own payments"
  on public.payments for all using (auth.uid() = user_id);

create index idx_payments_user_month on public.payments(user_id, month_ref);
create index idx_payments_student on public.payments(student_id);

-- ────────────────────────────────────────────────────
-- 8. STORAGE BUCKETS (fotos de evolução e bioimpedância)
-- ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('evolution-photos', 'evolution-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bioimpedance-images', 'bioimpedance-images', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own evolution photos"
  on storage.objects for insert
  with check (bucket_id = 'evolution-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own evolution photos"
  on storage.objects for select
  using (bucket_id = 'evolution-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own evolution photos"
  on storage.objects for delete
  using (bucket_id = 'evolution-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload own bioimpedance images"
  on storage.objects for insert
  with check (bucket_id = 'bioimpedance-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own bioimpedance images"
  on storage.objects for select
  using (bucket_id = 'bioimpedance-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own bioimpedance images"
  on storage.objects for delete
  using (bucket_id = 'bioimpedance-images' and auth.uid()::text = (storage.foldername(name))[1]);
