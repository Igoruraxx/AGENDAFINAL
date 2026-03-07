-- ============================================================
-- Migration 002: Create events table
-- Stores agenda appointments / tasks for each user
-- ============================================================

-- ────────────────────────────────────────────────────
-- EVENTS (agenda appointments and tasks)
-- ────────────────────────────────────────────────────
create table if not exists public.events (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  student_id   uuid,                          -- optional: link to a student
  title        text not null,
  description  text,
  type         text not null default 'appointment'
                 check (type in ('appointment', 'task', 'reminder', 'block')),
  status       text not null default 'scheduled'
                 check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  date         date not null,
  start_time   text not null,                 -- HH:MM format
  end_time     text,                          -- HH:MM format (optional)
  duration     integer not null default 60,   -- minutes
  is_recurring boolean not null default false,
  recurrence   jsonb,                         -- recurrence rule (optional)
  location     text,
  notes        text,
  color        text,                          -- hex color for UI
  deleted_at   timestamptz,                   -- soft delete
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create trigger events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at();

-- Performance indexes
create index idx_events_user_date   on public.events(user_id, date) where deleted_at is null;
create index idx_events_student     on public.events(student_id)    where deleted_at is null;
create index idx_events_type_status on public.events(user_id, type, status);
-- Composite index used by the RLS policy subquery in event_categories
create index idx_events_id_user_id  on public.events(id, user_id);
