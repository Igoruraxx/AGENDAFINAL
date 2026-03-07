-- ============================================================
-- Migration 005: Row Level Security (RLS) policies
-- Secures all tables so users can only access their own data
-- ============================================================

-- ── profiles ─────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- ── events ────────────────────────────────────────────────
alter table public.events enable row level security;

create policy "events_all_own"
  on public.events for all using (auth.uid() = user_id);

-- ── categories ────────────────────────────────────────────
alter table public.categories enable row level security;

create policy "categories_all_own"
  on public.categories for all using (auth.uid() = user_id);

-- ── event_categories ──────────────────────────────────────
alter table public.event_categories enable row level security;

-- Users may manage event_categories rows for events they own
create policy "event_categories_all_own"
  on public.event_categories for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

-- ── students ──────────────────────────────────────────────
alter table public.students enable row level security;

create policy "students_all_own"
  on public.students for all using (auth.uid() = user_id);

-- ── appointments ──────────────────────────────────────────
alter table public.appointments enable row level security;

create policy "appointments_all_own"
  on public.appointments for all using (auth.uid() = user_id);

-- ── evolution_photos ──────────────────────────────────────
alter table public.evolution_photos enable row level security;

create policy "evolution_photos_all_own"
  on public.evolution_photos for all using (auth.uid() = user_id);

-- ── bioimpedance ──────────────────────────────────────────
alter table public.bioimpedance enable row level security;

create policy "bioimpedance_all_own"
  on public.bioimpedance for all using (auth.uid() = user_id);

-- ── measurements ──────────────────────────────────────────
alter table public.measurements enable row level security;

create policy "measurements_all_own"
  on public.measurements for all using (auth.uid() = user_id);

-- ── payments ──────────────────────────────────────────────
alter table public.payments enable row level security;

create policy "payments_all_own"
  on public.payments for all using (auth.uid() = user_id);

-- ── storage: evolution-photos bucket ──────────────────────
create policy "storage_evolution_photos_insert"
  on storage.objects for insert
  with check (bucket_id = 'evolution-photos'
    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_evolution_photos_select"
  on storage.objects for select
  using (bucket_id = 'evolution-photos'
    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_evolution_photos_delete"
  on storage.objects for delete
  using (bucket_id = 'evolution-photos'
    and auth.uid()::text = (storage.foldername(name))[1]);

-- ── storage: bioimpedance-images bucket ───────────────────
create policy "storage_bioimpedance_insert"
  on storage.objects for insert
  with check (bucket_id = 'bioimpedance-images'
    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_bioimpedance_select"
  on storage.objects for select
  using (bucket_id = 'bioimpedance-images'
    and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_bioimpedance_delete"
  on storage.objects for delete
  using (bucket_id = 'bioimpedance-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
