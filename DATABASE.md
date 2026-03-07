# FitPro — Database Guide

**Supabase project URL**: `https://irergynffqnkertdagbs.supabase.co`  
**Stack**: PostgreSQL (via Supabase) · Row Level Security · React + TypeScript

---

## Entity Relationship Diagram

```
auth.users
    │
    ▼
profiles (1)
    │
    ├──< students (N)
    │       │
    │       ├──< appointments (N)
    │       ├──< evolution_photos (N)
    │       ├──< bioimpedance (N)
    │       ├──< measurements (N)
    │       └──< payments (N)
    │
    └── (user_id FK present in all child tables)
```

---

## Tables

### `profiles`
Extends `auth.users`. Created automatically on signup via the `on_auth_user_created` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → auth.users |
| `name` | text | |
| `email` | text | |
| `phone` | text \| null | |
| `plan` | `'free'` \| `'premium'` | Default `'free'` |
| `is_admin` | boolean | `true` for `semap.igor@gmail.com` |
| `notifications_enabled` | boolean | |
| `notify_before` | boolean | 24 h reminder |
| `notify_at_time` | boolean | At-appointment reminder |
| `daily_list_time` | text (HH:MM) | Daily schedule summary time |
| `subscription_end_date` | date \| null | |
| `subscription_origin` | `'trial'` \| `'courtesy'` \| `'paid'` \| null | |
| `subscription_history` | jsonb | Array of subscription events |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

---

### `students`
Alunos/pacientes linked to a trainer profile.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `user_id` | uuid | FK → profiles |
| `name` | text | |
| `phone` | text | |
| `plan` | `'monthly'` \| `'session'` \| `'long_term'` | |
| `value` | numeric(10,2) | Session/monthly price |
| `weekly_frequency` | integer | Times per week |
| `selected_days` | text[] | e.g. `['seg','qua','sex']` |
| `selected_times` | text[] | e.g. `['07:00','09:00']` |
| `is_consulting` | boolean | Consulting vs training |
| `is_active` | boolean | Soft-delete flag |
| `billing_day` | integer \| null | 1–31, for monthly plan |
| `plan_duration` | integer \| null | Months (long_term) |
| `total_value` | numeric \| null | Total (long_term) |
| `next_billing_date` | date \| null | Next expected payment |
| `share_token` | uuid \| null | Public evolution link token |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

---

### `appointments`
Scheduled training sessions.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → profiles |
| `student_id` | uuid | FK → students (cascade delete) |
| `date` | date | |
| `time` | text (HH:MM) | |
| `duration` | integer | Minutes, default 60 |
| `session_done` | boolean | |
| `muscle_groups` | text[] | 14 possible values |
| `notes` | text \| null | |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

**Constraints (enforced by DB trigger `appointments_validate`)**:
- `date` must not be in the past
- No two appointments for the same student at the same date+time

---

### `evolution_photos`
Progress photos (front, side, back views).

| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid |
| `student_id` | uuid |
| `date` | date |
| `front_url` / `side_url` / `back_url` | text \| null |
| `created_at` | timestamptz |

Photos are stored in the `evolution-photos` storage bucket.

---

### `bioimpedance`
Body composition analysis records.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid |
| `student_id` | uuid |
| `date` | date |
| `image_url` | text \| null |
| `weight` | numeric(6,2) |
| `body_fat_pct` | numeric(5,2) |
| `body_fat_kg` | numeric(6,2) |
| `muscle_mass` | numeric(6,2) |
| `visceral_fat` | numeric(5,1) |
| `lean_mass` | numeric(6,2) |
| `muscle_pct` | numeric(5,2) |
| `created_at` | timestamptz |

Images are stored in the `bioimpedance-images` storage bucket.

---

### `measurements`
Body circumference and skinfold measurements.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid |
| `student_id` | uuid |
| `date` | date |
| `weight` / `height` | numeric |
| `chest` / `waist` / `hip` / `arm` / `thigh` / `calf` | numeric (cm) |
| `sf_triceps` / `sf_biceps` / `sf_subscapular` / `sf_suprailiac` / `sf_abdominal` | numeric (mm) |
| `created_at` | timestamptz |

---

### `payments`
Monthly payment records linked to a student.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → profiles |
| `student_id` | uuid | FK → students (cascade delete) |
| `amount` | numeric(10,2) | |
| `due_date` | date | |
| `paid_at` | timestamptz \| null | |
| `status` | `'pending'` \| `'paid'` \| `'overdue'` | |
| `month_ref` | text (YYYY-MM) | |
| `created_at` | timestamptz | |

---

## Row Level Security (RLS)

All tables have RLS enabled. Every authenticated user can only see and modify **their own rows** (`auth.uid() = user_id`).

| Table | Policy |
|---|---|
| `profiles` | SELECT / INSERT / UPDATE own row (`id = auth.uid()`) |
| `students` | ALL own rows + public SELECT via `share_token` |
| `appointments` | ALL own rows |
| `evolution_photos` | ALL own rows |
| `bioimpedance` | ALL own rows |
| `measurements` | ALL own rows |
| `payments` | ALL own rows |

Storage buckets use folder-level RLS: `{userId}/{...}` paths are restricted to the matching user.

---

## Business Rules

### Plan Limits
| Plan | Max Students | Finance Module | Evolution Module |
|---|---|---|---|
| `free` | 5 | ❌ | ❌ |
| `premium` | Unlimited | ✅ | ✅ |

Enforced by:
1. **DB trigger** `students_validate_limit` — raises an error before insert.
2. **Client-side** `studentService.validateStudentLimit()` — shows a user-friendly message.
3. **UI** `usePermissions` hook — hides locked features.

### Appointments
- Cannot be created for past dates (trigger `appointments_validate`).
- No time conflicts for the same student (same trigger).
- Deactivating a student (`is_active = false`) deletes their future unfinished appointments (trigger `students_on_deactivate`).

### Payments
- Monthly payments are generated by `billingService.generateMonthlyPayment()`.
- `status` transitions: `pending` → `paid` (manual) or `pending` → `overdue` (automatic when `due_date < today`).
- Call `billingService.updateOverdueStatuses(userId)` on app startup to sync overdue status.

---

## Migrations

Located in `supabase/migrations/`. Run them in order against your Supabase project:

| File | Description |
|---|---|
| `001_create_profiles_table.sql` | profiles table + auto-create trigger |
| `002_create_students_table.sql` | students table + indexes |
| `003_create_appointments_table.sql` | appointments table + indexes |
| `004_create_evolution_photos_table.sql` | evolution_photos table |
| `005_create_bioimpedance_table.sql` | bioimpedance table |
| `006_create_measurements_table.sql` | measurements table |
| `007_create_payments_table.sql` | payments table |
| `008_setup_rls_policies.sql` | RLS policies + storage buckets |
| `009_create_database_functions.sql` | Business logic triggers & functions |

> **How to apply**: Go to **Supabase Dashboard → SQL Editor**, paste and run each file in order, or use the Supabase CLI with `supabase db push`.

---

## TypeScript Types

Auto-generated types live in `src/types/database.ts`. Use the helper aliases for convenience:

```ts
import type { Profile, DbStudent, DbAppointment, DbPayment } from './types/database';
```

For type-safe queries use `supabaseClient` from `src/lib/supabaseClient.ts`:

```ts
import { supabaseClient } from '../lib/supabaseClient';

const { data } = await supabaseClient
  .from('students')      // ← fully typed
  .select('*')
  .eq('user_id', userId);
```

---

## React Hooks

| Hook | Table(s) | Usage |
|---|---|---|
| `useProfiles` | profiles | Read/update own profile, notification prefs |
| `useStudents` | students | Full CRUD + share token + realtime |
| `useAppointments` | appointments | Full CRUD + mark done + realtime |
| `usePayments` | payments | List, mark paid/pending, add |
| `useEvolution` | photos + bio + measurements | Combined evolution data (existing) |
| `useEvolutionPhotos` | evolution_photos | Standalone photo CRUD |
| `useBioimpedance` | bioimpedance | Standalone bio CRUD |
| `useMeasurements` | measurements | Standalone measurements CRUD |
| `useDatabase` | any | Generic CRUD wrapper for custom queries |

---

## Services

| Service | Responsibility |
|---|---|
| `profileService` | Read profile, activate/downgrade subscription |
| `studentService` | Create (with plan validation), deactivate, share token |
| `appointmentService` | Schedule, mark done, next-date calc, session stats |
| `billingService` | Generate payments, mark paid, overdue sync, monthly summary |

---

## Seed Data

`supabase/seed.sql` contains example data for development.  
⚠️ Replace the hardcoded UUID with a real `auth.users` row before running.

```sql
-- In Supabase SQL Editor:
\i supabase/seed.sql
```
