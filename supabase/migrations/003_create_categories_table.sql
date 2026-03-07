-- ============================================================
-- Migration 003: Create categories table
-- User-defined labels/tags for events and tasks
-- ============================================================

-- ────────────────────────────────────────────────────
-- CATEGORIES (user-defined labels for events/tasks)
-- ────────────────────────────────────────────────────
create table if not exists public.categories (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  name       text not null,
  color      text not null default '#6366f1',  -- hex color for UI
  icon       text,                             -- optional icon name
  deleted_at timestamptz,                      -- soft delete
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Auto-update updated_at
create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at();

-- Performance index
create index idx_categories_user on public.categories(user_id) where deleted_at is null;
