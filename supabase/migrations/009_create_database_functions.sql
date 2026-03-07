-- Migration 009: Database functions and triggers
-- Funções de negócio: auto-pagamento, status overdue, validações

-- ── Auto-mark payments as overdue ────────────────────────────────────────────
-- Atualiza status para 'overdue' quando due_date passou e ainda está 'pending'
create or replace function public.update_overdue_payments()
returns void as $$
begin
  update public.payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;
end;
$$ language plpgsql security definer set search_path = public;

-- ── Auto-generate monthly payment for monthly-plan students ──────────────────
create or replace function public.generate_monthly_payment(
  p_user_id uuid,
  p_student_id uuid,
  p_amount numeric,
  p_billing_day integer,
  p_month_ref text  -- format: 'YYYY-MM'
)
returns uuid as $$
declare
  v_due_date date;
  v_existing_id uuid;
  v_new_id uuid;
begin
  -- Calculate due_date: cap billing_day at the last day of the month
  -- to avoid overflow (e.g. billing_day=31 in February)
  v_due_date := (p_month_ref || '-01')::date
                + (
                    least(
                      p_billing_day,
                      extract(day from
                        date_trunc('month', (p_month_ref || '-01')::date)
                        + interval '1 month'
                        - interval '1 day'
                      )::integer
                    ) - 1
                  ) * interval '1 day';

  -- Avoid duplicates for the same student+month
  select id into v_existing_id
  from public.payments
  where student_id = p_student_id
    and month_ref = p_month_ref
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into public.payments (user_id, student_id, amount, due_date, month_ref)
  values (p_user_id, p_student_id, p_amount, v_due_date, p_month_ref)
  returning id into v_new_id;

  return v_new_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ── Validate appointment: no past dates, no schedule conflicts ────────────────
create or replace function public.validate_appointment()
returns trigger as $$
begin
  -- Prevent appointments in the past
  if new.date < current_date then
    raise exception 'Não é possível agendar em datas passadas.';
  end if;

  -- Prevent schedule conflicts (same student, same date, same time)
  if exists (
    select 1 from public.appointments
    where student_id = new.student_id
      and date = new.date
      and time = new.time
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Conflito de horário: este aluno já tem agendamento neste horário.';
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists appointments_validate on public.appointments;
create trigger appointments_validate
  before insert or update on public.appointments
  for each row execute function public.validate_appointment();

-- ── Validate student limit for free plan ─────────────────────────────────────
create or replace function public.validate_student_limit()
returns trigger as $$
declare
  v_plan text;
  v_count integer;
  v_max integer := 5; -- free plan limit
begin
  select plan into v_plan from public.profiles where id = new.user_id;

  if v_plan = 'free' then
    select count(*) into v_count
    from public.students
    where user_id = new.user_id and is_active = true;

    if v_count >= v_max then
      raise exception 'Limite de % alunos atingido no plano gratuito.', v_max;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists students_validate_limit on public.students;
create trigger students_validate_limit
  before insert on public.students
  for each row execute function public.validate_student_limit();

-- ── Cascade soft-delete: mark appointments as done when student deactivated ──
create or replace function public.handle_student_deactivated()
returns trigger as $$
begin
  -- When a student is deactivated, cancel their future appointments
  if old.is_active and not new.is_active then
    delete from public.appointments
    where student_id = new.id
      and date >= current_date
      and session_done = false;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists students_on_deactivate on public.students;
create trigger students_on_deactivate
  after update of is_active on public.students
  for each row execute function public.handle_student_deactivated();
