-- ============================================================
-- Migration 001: Create profiles table
-- Extends auth.users with application-specific fields
-- ============================================================

-- Utility function: auto-update updated_at on row change
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- ────────────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                   uuid references auth.users(id) on delete cascade primary key,
  name                 text not null,
  email                text not null,
  phone                text,
  plan                 text not null default 'free'
                         check (plan in ('free', 'premium')),
  is_admin             boolean not null default false,
  notifications_enabled boolean not null default true,
  notify_before        boolean not null default true,
  notify_at_time       boolean not null default true,
  daily_list_time      text not null default '08:00',
  subscription_end_date date,
  subscription_origin  text
                         check (subscription_origin in ('trial', 'courtesy', 'paid')),
  subscription_history jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-update updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- Auto-create profile on signup
-- semap.igor@gmail.com receives is_admin = true automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    new.email = 'semap.igor@gmail.com'
  )
  on conflict (id) do update
    set is_admin = (excluded.email = 'semap.igor@gmail.com' or public.profiles.is_admin);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
