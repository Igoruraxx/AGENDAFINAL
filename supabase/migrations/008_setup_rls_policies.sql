-- Migration 008: Setup Row Level Security (RLS) policies
-- Garante que cada usuário acessa apenas seus próprios dados

-- ── profiles ──────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- ── students ──────────────────────────────────────────────────────────────────
alter table public.students enable row level security;

create policy "students_all_own"
  on public.students for all using (auth.uid() = user_id);

-- Public read access via share_token (sem autenticação)
create policy "students_public_share_token"
  on public.students for select
  using (share_token is not null);

-- ── appointments ──────────────────────────────────────────────────────────────
alter table public.appointments enable row level security;

create policy "appointments_all_own"
  on public.appointments for all using (auth.uid() = user_id);

-- ── evolution_photos ──────────────────────────────────────────────────────────
alter table public.evolution_photos enable row level security;

create policy "evolution_photos_all_own"
  on public.evolution_photos for all using (auth.uid() = user_id);

-- ── bioimpedance ──────────────────────────────────────────────────────────────
alter table public.bioimpedance enable row level security;

create policy "bioimpedance_all_own"
  on public.bioimpedance for all using (auth.uid() = user_id);

-- ── measurements ──────────────────────────────────────────────────────────────
alter table public.measurements enable row level security;

create policy "measurements_all_own"
  on public.measurements for all using (auth.uid() = user_id);

-- ── payments ──────────────────────────────────────────────────────────────────
alter table public.payments enable row level security;

create policy "payments_all_own"
  on public.payments for all using (auth.uid() = user_id);

-- ── Storage buckets ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('evolution-photos', 'evolution-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bioimpedance-images', 'bioimpedance-images', false)
on conflict (id) do nothing;

create policy "evolution_photos_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'evolution-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "evolution_photos_select_own"
  on storage.objects for select
  using (bucket_id = 'evolution-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "evolution_photos_delete_own"
  on storage.objects for delete
  using (bucket_id = 'evolution-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "bioimpedance_images_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'bioimpedance-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "bioimpedance_images_select_own"
  on storage.objects for select
  using (bucket_id = 'bioimpedance-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "bioimpedance_images_delete_own"
  on storage.objects for delete
  using (bucket_id = 'bioimpedance-images' and auth.uid()::text = (storage.foldername(name))[1]);
