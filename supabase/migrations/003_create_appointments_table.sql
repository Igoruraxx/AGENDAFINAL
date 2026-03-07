-- Migration 003: Create appointments table
-- Agendamentos de sessões para cada aluno

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

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.update_updated_at();

create index if not exists idx_appointments_user_date on public.appointments(user_id, date);
create index if not exists idx_appointments_student on public.appointments(student_id);
create index if not exists idx_appointments_date on public.appointments(date);
