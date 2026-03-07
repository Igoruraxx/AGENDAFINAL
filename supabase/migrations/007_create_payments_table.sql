-- ============================================================
-- Migration 007: Create payments table
-- Financial records for student billing
-- ============================================================

-- ────────────────────────────────────────────────────
-- PAYMENTS
-- ────────────────────────────────────────────────────
create table if not exists public.payments (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  amount     numeric(10,2) not null,
  due_date   date not null,
  paid_at    timestamptz,
  status     text not null default 'pending'
               check (status in ('pending', 'paid', 'overdue')),
  month_ref  text not null,   -- format: 'YYYY-MM'
  created_at timestamptz not null default now()
);

-- Performance indexes
create index idx_payments_user_month on public.payments(user_id, month_ref);
create index idx_payments_student    on public.payments(student_id);
