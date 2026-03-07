-- Migration 004: Create evolution_photos table
-- Fotos de evolução corporal dos alunos

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

create index if not exists idx_evolution_photos_student on public.evolution_photos(student_id, date);
create index if not exists idx_evolution_photos_user on public.evolution_photos(user_id);
