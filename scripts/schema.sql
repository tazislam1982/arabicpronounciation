-- db/schema.sql
-- ⬇️ Paste the full schema here (members, courses, lessons, enrollments, scores, payments, enrollment_reports)
-- ... (full schema from previous message) ...
-- =========================================================
-- Vercel Postgres schema (with int PK + uuid keys)
-- Tables: members, courses, lessons, enrollments, scores, payments, enrollment_reports
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists citext;    -- case-insensitive email

-- ---------- Enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'enrollment_status') then
    create type enrollment_status as enum ('active','completed','paused','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('requires_payment','pending','succeeded','failed','refunded','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_level') then
    create type course_level as enum ('beginner','intermediate','advanced');
  end if;
end $$;

-- =========================================================
-- Members
-- =========================================================
create table if not exists members (
  id                bigserial primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  email             citext not null unique,
  name              text,
  password_hash     text,                         -- null if using SSO
  auth_provider     text default 'password',      -- 'password','github','google', etc.
  avatar_url        text,
  locale            text default 'en',
  timezone          text default 'UTC',
  is_active         boolean not null default true,
  last_login_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists idx_members_active on members (is_active) where deleted_at is null;

-- =========================================================
-- Courses
-- =========================================================
create table if not exists courses (
  id                bigserial primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  slug              text not null unique,         -- e.g., 'arabic-101'
  title             text not null,
  description       text,
  level             course_level not null default 'beginner',
  language_code     text not null default 'ar',   -- ISO code
  thumbnail_url     text,
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists idx_courses_published on courses (is_published) where deleted_at is null;

-- =========================================================
-- Lessons (child of courses)
-- =========================================================
create table if not exists lessons (
  id                bigserial primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  course_uuid       uuid not null references courses(uuid) on delete cascade,
  slug              text not null,                -- unique per course
  title             text not null,
  order_index       int not null default 1,       -- position
  duration_minutes  int check (duration_minutes >= 0),
  content_url       text,                         -- CMS/MD/JSON, etc.
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (course_uuid, slug)
);

create index if not exists idx_lessons_course_order on lessons (course_uuid, order_index) where deleted_at is null;
create index if not exists idx_lessons_published on lessons (is_published) where deleted_at is null;

-- =========================================================
-- Enrollments (member <-> course)
-- =========================================================
create table if not exists enrollments (
  id                bigserial primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  member_uuid       uuid not null references members(uuid) on delete cascade,
  course_uuid       uuid not null references courses(uuid) on delete cascade,
  status            enrollment_status not null default 'active',
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  progress_percent  numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  last_lesson_uuid  uuid references lessons(uuid) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (member_uuid, course_uuid)
);

create index if not exists idx_enrollments_member on enrollments (member_uuid) where deleted_at is null;
create index if not exists idx_enrollments_course on enrollments (course_uuid) where deleted_at is null;
create index if not exists idx_enrollments_status on enrollments (status) where deleted_at is null;

-- =========================================================
-- Scores (per lesson attempt)
-- =========================================================
create table if not exists scores (
  id                bigserial primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  member_uuid       uuid not null references members(uuid) on delete cascade,
  course_uuid       uuid not null references courses(uuid) on delete cascade,
  lesson_uuid       uuid not null references lessons(uuid) on delete cascade,
  enrollment_uuid   uuid references enrollments(uuid) on delete cascade,
  attempt_no        int not null default 1 check (attempt_no > 0),
  score_percent     numeric(5,2) not null check (score_percent >= 0 and score_percent <= 100),
  duration_seconds  int not null default 0 check (duration_seconds >= 0),
  accuracy          numeric(5,2) check (accuracy >= 0 and accuracy <= 100),
  details           jsonb,                         -- raw metrics, phoneme, etc.
  recorded_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists idx_scores_member_lesson on scores (member_uuid, lesson_uuid) where deleted_at is null;
create index if not exists idx_scores_enrollment on scores (enrollment_uuid) where deleted_at is null;
create index if not exists idx_scores_recorded_at on scores (recorded_at desc);

-- =========================================================
-- Payments (member-level; optionally ties to an enrollment)
-- =========================================================
create table if not exists payments (
  id                bigserial primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  member_uuid       uuid not null references members(uuid) on delete cascade,
  enrollment_uuid   uuid references enrollments(uuid) on delete set null,
  amount_cents      int not null check (amount_cents >= 0),
  currency          char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status            payment_status not null default 'pending',
  provider          text not null default 'stripe',
  provider_ref      text,                          -- e.g., PaymentIntent id
  created_at        timestamptz not null default now(),
  captured_at       timestamptz,
  refunded_at       timestamptz,
  meta              jsonb default '{}'::jsonb,
  deleted_at        timestamptz
);

create index if not exists idx_payments_member on payments (member_uuid) where deleted_at is null;
create index if not exists idx_payments_status on payments (status) where deleted_at is null;
create index if not exists idx_payments_created on payments (created_at desc);

-- =========================================================
-- Enrollment Reports (periodic aggregates)
-- =========================================================
create table if not exists enrollment_reports (
  id                 bigserial primary key,
  uuid               uuid not null unique default gen_random_uuid(),
  enrollment_uuid    uuid not null references enrollments(uuid) on delete cascade,
  period_start       timestamptz not null,
  period_end         timestamptz not null,
  lessons_completed  int not null default 0 check (lessons_completed >= 0),
  total_time_seconds int not null default 0 check (total_time_seconds >= 0),
  avg_score_percent  numeric(5,2),
  last_activity_at   timestamptz,
  generated_at       timestamptz not null default now(),
  unique (enrollment_uuid, period_start, period_end)
);

create index if not exists idx_enrollment_reports_period on enrollment_reports (period_start, period_end);

-- =========================================================
-- Triggers: updated_at maintenance
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tg_members_updated_at') then
    create trigger tg_members_updated_at before update on members
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tg_courses_updated_at') then
    create trigger tg_courses_updated_at before update on courses
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tg_lessons_updated_at') then
    create trigger tg_lessons_updated_at before update on lessons
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'tg_enrollments_updated_at') then
    create trigger tg_enrollments_updated_at before update on enrollments
      for each row execute function set_updated_at();
  end if;
end $$;

-- =========================================================
-- View: enrollment_progress_view (uuid-based)
-- =========================================================
create or replace view enrollment_progress_view as
select
  e.uuid                        as enrollment_uuid,
  e.member_uuid,
  e.course_uuid,
  e.status,
  e.progress_percent,
  count(distinct l.uuid)        as total_lessons,
  count(distinct case when s.score_percent >= 60 then s.lesson_uuid end) as lessons_completed,
  max(s.recorded_at)            as last_activity_at
from enrollments e
join lessons l
  on l.course_uuid = e.course_uuid and l.deleted_at is null
left join scores s
  on s.enrollment_uuid = e.uuid and s.lesson_uuid = l.uuid and s.deleted_at is null
where e.deleted_at is null
group by e.uuid, e.member_uuid, e.course_uuid, e.status, e.progress_percent;

-- =========================================================
-- (Optional) Seeds for quick testing
-- =========================================================
-- insert into members (email, name) values ('student@example.com','Test Student');
-- insert into courses (slug, title, is_published) values ('arabic-101','Arabic 101', true);
-- insert into lessons (course_uuid, slug, title, order_index, duration_minutes, is_published)
--   values ((select uuid from courses where slug='arabic-101'), 'core-1-1','Core Lesson 1.1',1,10,true);
-- insert into enrollments (member_uuid, course_uuid, status) values
--   ((select uuid from members where email='student@example.com'), (select uuid from courses where slug='arabic-101'), 'active');
