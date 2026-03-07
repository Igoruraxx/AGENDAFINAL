-- ============================================================
-- Migration 004: Create event_categories junction table
-- N:N relationship between events and categories
-- ============================================================

-- ────────────────────────────────────────────────────
-- EVENT_CATEGORIES (N:N: events <-> categories)
-- ────────────────────────────────────────────────────
create table if not exists public.event_categories (
  event_id    uuid references public.events(id)     on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  created_at  timestamptz not null default now(),
  primary key (event_id, category_id)
);

-- Performance indexes
create index idx_event_categories_event    on public.event_categories(event_id);
create index idx_event_categories_category on public.event_categories(category_id);
