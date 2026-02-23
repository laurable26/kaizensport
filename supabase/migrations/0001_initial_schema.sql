-- ============================================================
-- TOP - Fitness Tracker
-- Schema initial
-- Coller ce fichier dans Supabase > SQL Editor > Run
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

create table if not exists exercises (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  photo_url     text,
  notes         text,
  external_link text,
  muscle_group  text,
  equipment     text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists exercise_sets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  weight      numeric(6,2),
  reps        smallint,
  logged_at   timestamptz default now()
);

create table if not exists sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  planned_date date,
  planned_time time,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists session_exercises (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid not null references sessions(id) on delete cascade,
  exercise_id    uuid not null references exercises(id) on delete cascade,
  order_index    smallint not null default 0,
  sets_planned   smallint not null default 3,
  rest_seconds   smallint not null default 60,
  target_reps    smallint,
  target_weight  numeric(6,2),
  unique (session_id, exercise_id)
);

create table if not exists session_logs (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  session_id       uuid references sessions(id) on delete set null,
  started_at       timestamptz default now(),
  completed_at     timestamptz,
  overall_feeling  smallint check (overall_feeling between 1 and 5),
  notes            text
);

create table if not exists set_logs (
  id               uuid primary key default uuid_generate_v4(),
  session_log_id   uuid not null references session_logs(id) on delete cascade,
  exercise_id      uuid not null references exercises(id) on delete cascade,
  set_number       smallint not null,
  weight           numeric(6,2),
  reps             smallint,
  feeling          smallint check (feeling between 1 and 5),
  rest_seconds     smallint,
  logged_at        timestamptz default now()
);

create table if not exists workouts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  rounds      smallint default 1,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists workout_exercises (
  id                 uuid primary key default uuid_generate_v4(),
  workout_id         uuid not null references workouts(id) on delete cascade,
  exercise_id        uuid not null references exercises(id) on delete cascade,
  order_index        smallint not null default 0,
  duration_seconds   smallint,
  reps               smallint,
  rest_after_seconds smallint not null default 30
);

create table if not exists scheduled_events (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  session_id        uuid references sessions(id) on delete cascade,
  workout_id        uuid references workouts(id) on delete cascade,
  planned_date      date not null,
  planned_time      time,
  notification_sent boolean default false,
  created_at        timestamptz default now(),
  constraint one_type check (
    (session_id is not null and workout_id is null) or
    (workout_id is not null and session_id is null)
  )
);

create table if not exists push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  user_agent   text,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table exercises           enable row level security;
alter table exercise_sets       enable row level security;
alter table sessions            enable row level security;
alter table session_exercises   enable row level security;
alter table session_logs        enable row level security;
alter table set_logs            enable row level security;
alter table workouts            enable row level security;
alter table workout_exercises   enable row level security;
alter table scheduled_events    enable row level security;
alter table push_subscriptions  enable row level security;

-- Exercises
create policy "user_exercises" on exercises
  for all using (auth.uid() = user_id);

-- Exercise sets
create policy "user_exercise_sets" on exercise_sets
  for all using (auth.uid() = user_id);

-- Sessions
create policy "user_sessions" on sessions
  for all using (auth.uid() = user_id);

-- Session exercises (via session ownership)
create policy "user_session_exercises" on session_exercises
  for all using (
    exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- Session logs
create policy "user_session_logs" on session_logs
  for all using (auth.uid() = user_id);

-- Set logs (via session_log ownership)
create policy "user_set_logs" on set_logs
  for all using (
    exists (select 1 from session_logs sl where sl.id = session_log_id and sl.user_id = auth.uid())
  );

-- Workouts
create policy "user_workouts" on workouts
  for all using (auth.uid() = user_id);

-- Workout exercises (via workout ownership)
create policy "user_workout_exercises" on workout_exercises
  for all using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- Scheduled events
create policy "user_scheduled_events" on scheduled_events
  for all using (auth.uid() = user_id);

-- Push subscriptions
create policy "user_push_subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_exercises_user_id on exercises (user_id);
create index if not exists idx_exercises_name on exercises (user_id, name);
create index if not exists idx_exercise_sets_exercise on exercise_sets (exercise_id, logged_at desc);
create index if not exists idx_session_logs_user on session_logs (user_id, started_at desc);
create index if not exists idx_set_logs_session on set_logs (session_log_id);
create index if not exists idx_set_logs_exercise on set_logs (exercise_id);
create index if not exists idx_scheduled_events_user_date on scheduled_events (user_id, planned_date);
create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────────────────────
-- Créer manuellement dans Supabase Dashboard > Storage :
-- Nom du bucket : exercise-photos
-- Public : false
-- Taille max : 5MB
-- Types MIME autorisés : image/jpeg, image/png, image/webp

-- Policy Storage (à exécuter APRÈS création du bucket) :
-- insert into storage.buckets (id, name, public) values ('exercise-photos', 'exercise-photos', false);

create policy "user_storage" on storage.objects
  for all using (
    bucket_id = 'exercise-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
