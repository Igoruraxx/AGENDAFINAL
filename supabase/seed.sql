-- Seed data for FitPro development/testing
-- ⚠️  Do NOT run in production. Requires an existing auth.users row.
-- Replace the UUIDs below with real values from your Supabase Auth dashboard.

-- ── Example profile (matches an auth.users row) ───────────────────────────────
-- Replace 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' with a real user UUID
do $$
declare
  v_user_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
  v_student1 uuid := gen_random_uuid();
  v_student2 uuid := gen_random_uuid();
  v_student3 uuid := gen_random_uuid();
begin

  -- Profile
  insert into public.profiles (id, name, email, plan, is_admin)
  values (v_user_id, 'Personal Trainer Demo', 'demo@fitpro.com', 'premium', false)
  on conflict (id) do nothing;

  -- Students
  insert into public.students
    (id, user_id, name, phone, plan, value, weekly_frequency, selected_days, selected_times, billing_day, is_active)
  values
    (v_student1, v_user_id, 'Ana Silva',    '11999990001', 'monthly',   200.00, 3, ARRAY['seg','qua','sex'], ARRAY['07:00','09:00','11:00'], 5,  true),
    (v_student2, v_user_id, 'Bruno Costa',  '11999990002', 'monthly',   180.00, 2, ARRAY['ter','qui'],       ARRAY['18:00','20:00'],          10, true),
    (v_student3, v_user_id, 'Carla Nunes',  '11999990003', 'session',   80.00,  1, ARRAY['sab'],             ARRAY['08:00'],                  null, true)
  on conflict (id) do nothing;

  -- Appointments (next 7 days)
  insert into public.appointments (user_id, student_id, date, time, duration)
  values
    (v_user_id, v_student1, current_date + 1, '07:00', 60),
    (v_user_id, v_student2, current_date + 2, '18:00', 60),
    (v_user_id, v_student1, current_date + 3, '09:00', 60),
    (v_user_id, v_student3, current_date + 5, '08:00', 60);

  -- Measurements
  insert into public.measurements
    (user_id, student_id, date, weight, height, chest, waist, hip, arm, thigh, calf)
  values
    (v_user_id, v_student1, current_date - 30, 65.5, 165.0, 88.0, 70.0, 94.0, 28.0, 56.0, 36.0),
    (v_user_id, v_student1, current_date,      63.0, 165.0, 86.0, 68.0, 92.0, 27.5, 55.0, 35.5);

  -- Payments (current month)
  insert into public.payments (user_id, student_id, amount, due_date, month_ref, status)
  values
    (v_user_id, v_student1, 200.00, date_trunc('month', current_date)::date + 4,  to_char(current_date, 'YYYY-MM'), 'pending'),
    (v_user_id, v_student2, 180.00, date_trunc('month', current_date)::date + 9,  to_char(current_date, 'YYYY-MM'), 'paid'),
    (v_user_id, v_student3, 80.00,  date_trunc('month', current_date)::date + 14, to_char(current_date, 'YYYY-MM'), 'pending');

end $$;
