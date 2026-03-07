# 🧬 SYNAPSE-VAULT — Database Architecture Blueprint

> **Disruptive Repository Name:** `synapse-vault`
>
> A zero-latency, event-sourced fitness intelligence platform with a pluggable
> data layer. This document is the canonical database blueprint for the
> standalone `synapse-vault` backend repository.

---

## 📐 Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Offline-first** | Full functionality with `localStorage`; cloud sync is optional |
| **Multi-backend** | Same service interfaces run on PostgreSQL, SQLite, IndexedDB, or in-memory |
| **Event-sourced** | Append-only audit log; state is derived from events |
| **Row-Level Security** | Every table is scoped by `user_id`; RLS enforced at DB level |
| **Pluggable auth** | Auth is an adapter, not a dependency (Supabase today, Clerk / Auth0 / custom tomorrow) |
| **Schema-as-code** | All migrations versioned and idempotent |

---

## 🗂️ Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYNAPSE-VAULT DATABASE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  AUTH LAYER (managed by auth provider)                                      │
│  ┌──────────────┐                                                           │
│  │ auth.users   │  ← Supabase / Clerk / custom JWT                         │
│  └──────┬───────┘                                                           │
│         │ 1:1                                                               │
│  DATA LAYER                                                                 │
│  ┌──────▼───────┐   1:N  ┌────────────┐   1:N  ┌──────────────────┐       │
│  │   profiles   ├────────┤  students  ├────────┤  appointments    │       │
│  └──────────────┘        └─────┬──────┘        └──────────────────┘       │
│                                │                                           │
│                         1:N ───┼─── 1:N                                   │
│                    ┌───────────▼───────────────┐                           │
│                    │     evolution_photos        │                          │
│                    │     bioimpedance           │                          │
│                    │     measurements           │                          │
│                    └───────────────────────────┘                           │
│                                                                             │
│  ┌──────────────┐   ┌────────────────┐   ┌────────────────────────┐       │
│  │   payments   │   │    events      │   │  categories /          │       │
│  │              │   │  (tasks,       │   │  event_categories      │       │
│  │              │   │   reminders)   │   │                        │       │
│  └──────────────┘   └────────────────┘   └────────────────────────┘       │
│                                                                             │
│  AUDIT LAYER                                                                │
│  ┌──────────────────────────┐  ┌────────────────────────────────────┐     │
│  │   subscription_history   │  │          audit_log                  │     │
│  └──────────────────────────┘  └────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Table Definitions

### `profiles`

Extends `auth.users` with application-level metadata.

```sql
CREATE TABLE profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  phone                   TEXT,

  -- Subscription
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscription_start_date DATE,
  subscription_end_date   DATE,
  subscription_origin     TEXT DEFAULT 'trial' CHECK (subscription_origin IN ('paid', 'courtesy', 'trial')),
  subscription_history    JSONB NOT NULL DEFAULT '[]',

  -- Notification preferences
  notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_before           BOOLEAN NOT NULL DEFAULT TRUE,
  notify_at_time          BOOLEAN NOT NULL DEFAULT TRUE,
  daily_list_time         TEXT NOT NULL DEFAULT '08:00',

  -- Access control
  is_admin                BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `students`

Personal trainer clients / students.

```sql
CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  notes             TEXT,

  -- Plan & billing
  plan              TEXT NOT NULL DEFAULT 'monthly'
                      CHECK (plan IN ('monthly', 'session', 'long_term')),
  value             NUMERIC(10,2) NOT NULL DEFAULT 0,
  plan_duration     INTEGER,        -- months for long_term plans
  total_value       NUMERIC(10,2),  -- total contract value
  billing_day       SMALLINT CHECK (billing_day BETWEEN 1 AND 31),
  next_billing_date DATE,

  -- Schedule
  weekly_frequency  SMALLINT NOT NULL DEFAULT 3 CHECK (weekly_frequency BETWEEN 1 AND 7),
  selected_days     TEXT[] NOT NULL DEFAULT '{}',   -- ['mon','wed','fri']
  selected_times    TEXT[] NOT NULL DEFAULT '{}',   -- ['07:00','09:00']

  -- Status
  is_consulting     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,

  -- Sharing
  share_token       UUID UNIQUE DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_user_id   ON students(user_id);
CREATE INDEX idx_students_share_token ON students(share_token);
```

---

### `appointments`

Individual training sessions linked to a student.

```sql
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Schedule
  date            DATE NOT NULL,
  time            TEXT NOT NULL,   -- 'HH:MM' 24h
  duration        INTEGER NOT NULL DEFAULT 60,  -- minutes

  -- Outcome
  session_done    BOOLEAN NOT NULL DEFAULT FALSE,
  muscle_groups   TEXT[] DEFAULT '{}',   -- enum values from MuscleGroup
  notes           TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_user_date ON appointments(user_id, date);
CREATE INDEX idx_appointments_student   ON appointments(student_id);
```

**Muscle group enum values:**
`peito`, `costas`, `ombros`, `biceps`, `triceps`, `quadriceps`, `posterior`,
`gluteos`, `panturrilha`, `abdomen`, `trapezio`, `antebraco`, `full_body`, `cardio`

---

### `events`

Generic calendar entries (tasks, reminders, time blocks).

```sql
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES students(id) ON DELETE SET NULL,

  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'appointment'
                  CHECK (type IN ('appointment', 'task', 'reminder', 'block')),
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),

  -- Time
  date          DATE NOT NULL,
  start_time    TEXT NOT NULL,    -- 'HH:MM'
  end_time      TEXT,             -- nullable for open-ended
  duration      INTEGER DEFAULT 60,
  is_recurring  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Meta
  location      TEXT,
  notes         TEXT,
  color         TEXT,             -- hex colour override

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_date ON events(user_id, date);
```

---

### `categories` and `event_categories`

Tagging system for events.

```sql
CREATE TABLE categories (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  color    TEXT NOT NULL DEFAULT '#6366f1',
  icon     TEXT
);

CREATE TABLE event_categories (
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, category_id)
);
```

---

### `payments`

Financial tracking — one row per student per billing cycle.

```sql
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Amount
  amount      NUMERIC(10,2) NOT NULL,

  -- Status
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid', 'overdue')),
  due_date    DATE NOT NULL,
  paid_at     TIMESTAMPTZ,

  -- Reference
  month_ref   TEXT NOT NULL,   -- 'MM-YYYY' e.g. '03-2025'

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_month  ON payments(user_id, month_ref);
CREATE INDEX idx_payments_student     ON payments(student_id);
```

---

### `evolution_photos`

Progress photos (front, side, back views) with file references.

```sql
CREATE TABLE evolution_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date        DATE NOT NULL,

  -- Storage URLs (Supabase Storage / S3 / CDN)
  front_url   TEXT,
  side_url    TEXT,
  back_url    TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_student_date ON evolution_photos(student_id, date DESC);
```

---

### `bioimpedance`

Body composition measurements from bioimpedance devices.

```sql
CREATE TABLE bioimpedance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date          DATE NOT NULL,

  -- Device scan image
  image_url     TEXT,

  -- Metrics
  weight        NUMERIC(5,2) NOT NULL,   -- kg
  body_fat_pct  NUMERIC(5,2),            -- %
  body_fat_kg   NUMERIC(5,2),            -- kg
  muscle_mass   NUMERIC(5,2),            -- kg
  visceral_fat  NUMERIC(4,1),            -- rating 1-59
  lean_mass     NUMERIC(5,2),            -- kg
  muscle_pct    NUMERIC(5,2),            -- %

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bioimpedance_student_date ON bioimpedance(student_id, date ASC);
```

---

### `measurements`

Anthropometric measurements (tape measure + skinfold calipers).

```sql
CREATE TABLE measurements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date            DATE NOT NULL,

  -- Primary biometrics
  weight          NUMERIC(5,2) NOT NULL,  -- kg
  height          NUMERIC(5,1),           -- cm

  -- Circumferences (cm)
  chest           NUMERIC(5,1),
  waist           NUMERIC(5,1),
  hip             NUMERIC(5,1),
  arm             NUMERIC(5,1),
  thigh           NUMERIC(5,1),
  calf            NUMERIC(5,1),

  -- Skinfolds (mm)
  sf_triceps      NUMERIC(4,1),
  sf_biceps       NUMERIC(4,1),
  sf_subscapular  NUMERIC(4,1),
  sf_suprailiac   NUMERIC(4,1),
  sf_abdominal    NUMERIC(4,1),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_measurements_student_date ON measurements(student_id, date ASC);
```

---

### `audit_log`

Immutable event log for data changes (event-sourcing ready).

```sql
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity      TEXT NOT NULL,        -- 'student', 'appointment', etc.
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,        -- 'create', 'update', 'delete'
  before      JSONB,                -- snapshot before change
  after       JSONB,                -- snapshot after change
  metadata    JSONB DEFAULT '{}',   -- IP, user agent, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user    ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_entity  ON audit_log(entity, entity_id);
```

---

## 🔐 Row-Level Security (RLS) Policies

All tables enforce user-based data isolation:

```sql
-- Profiles: users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_self ON profiles
  USING (id = auth.uid());

-- Students: scoped to authenticated owner
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_owner ON students
  USING (user_id = auth.uid());

-- Students: public read via share_token (no auth required)
CREATE POLICY students_share_token ON students
  FOR SELECT USING (share_token IS NOT NULL);

-- Appointments, payments, events: scoped to owner
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_owner ON appointments USING (user_id = auth.uid());

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_owner ON payments USING (user_id = auth.uid());

-- Evolution tables: owner + public read via share_token
ALTER TABLE evolution_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY photos_owner ON evolution_photos USING (user_id = auth.uid());
CREATE POLICY photos_public ON evolution_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.share_token IS NOT NULL)
  );

-- Admin: full access
CREATE POLICY admin_all ON profiles
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));
```

---

## 🔄 Multi-Backend Adapter Contract

The `IDataServices` TypeScript interface (in `src/services/IDataService.ts`)
is the **canonical contract** that all backend implementations must satisfy:

| Adapter | Status | Notes |
|---------|--------|-------|
| `LocalStorageService` | ✅ Implemented | Offline-first, instant |
| `SupabaseService`     | ✅ Implemented | Production backend |
| `IndexedDBService`    | 🔜 Planned | Large offline datasets |
| `SQLiteService`       | 🔜 Planned | Electron / Tauri desktop |
| `RESTService`         | 🔜 Planned | Custom Express/FastAPI backend |

Switching backends requires **zero UI changes** — only the context provider's
`backend` prop changes.

---

## 🚀 Migration Strategy

Migrations live in `/supabase/migrations/` and follow the naming convention
`NNN_descriptive_name.sql` where `NNN` is a zero-padded sequence number.

```
001_create_profiles_table.sql
002_create_events_table.sql
003_create_categories_table.sql
004_create_event_categories_table.sql
005_setup_rls_policies.sql
006_create_students_table.sql
007_create_payments_table.sql
008_create_evolution_tables.sql
009_add_audit_log.sql              ← new
010_add_updated_at_triggers.sql    ← new
```

---

## 📊 Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| `students` | `user_id` | Fast lookups by trainer |
| `students` | `share_token` | Public portal |
| `appointments` | `(user_id, date)` | Calendar range queries |
| `appointments` | `student_id` | Session history |
| `payments` | `(user_id, month_ref)` | Monthly financial overview |
| `evolution_*` | `(student_id, date)` | Progress timelines |
| `audit_log` | `(user_id, created_at)` | User activity history |

---

## 🌐 Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `evolution-photos` | Progress photos (front/side/back) | Private (owner) + public via share_token |
| `bioimpedance-images` | Body scan images | Private (owner) |
| `profile-avatars` | Trainer profile photos | Public |

---

## 🧩 Future Extensions

- **`workouts` table** — template-based workout plans assignable to students
- **`exercises` table** — exercise library with muscle group mappings
- **`goals` table** — SMART goals tracked against measurement data
- **`notifications` table** — server-side push notification queue
- **`integrations` table** — API keys for wearables (Garmin, Fitbit, Apple Health)
- **`ai_insights` table** — ML-derived progression recommendations
