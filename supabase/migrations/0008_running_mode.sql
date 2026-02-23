-- =====================================================================
-- Migration 0008 : Mode Course à pied
-- À exécuter dans le Supabase SQL Editor
-- =====================================================================

-- 1. app_mode dans profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS app_mode TEXT
    CHECK (app_mode IN ('musculation', 'running'))
    DEFAULT 'musculation';

-- 2. Plans de course (templates créés par l'utilisateur)
CREATE TABLE IF NOT EXISTS running_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('free', 'distance', 'duration', 'interval')),
  target_distance_m   INTEGER,
  target_duration_s   INTEGER,
  warmup_duration_s   INTEGER,
  cooldown_duration_s INTEGER,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Blocs d'intervalles (appartiennent à un running_session de type 'interval')
CREATE TABLE IF NOT EXISTS running_interval_blocks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  running_session_id  UUID NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
  order_index         INTEGER NOT NULL DEFAULT 0,
  label               TEXT,
  phase               TEXT NOT NULL CHECK (phase IN ('work', 'rest')),
  duration_s          INTEGER NOT NULL,
  target_pace_min_km  NUMERIC(5,2),
  repetitions         INTEGER NOT NULL DEFAULT 1
);

-- 4. Logs de courses complétées
CREATE TABLE IF NOT EXISTS running_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  running_session_id  UUID REFERENCES running_sessions(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  distance_m          INTEGER,
  duration_s          INTEGER,
  avg_pace_s_per_km   INTEGER,
  best_pace_s_per_km  INTEGER,
  elevation_gain_m    INTEGER,
  gps_track           JSONB,
  overall_feeling     SMALLINT CHECK (overall_feeling BETWEEN 1 AND 5),
  notes               TEXT
);

-- 5. Records personnels (upsert par user_id + distance)
CREATE TABLE IF NOT EXISTS running_personal_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distance        TEXT NOT NULL CHECK (distance IN ('5k', '10k', 'semi', 'marathon')),
  duration_s      INTEGER NOT NULL,
  achieved_at     TIMESTAMPTZ NOT NULL,
  running_log_id  UUID REFERENCES running_logs(id) ON DELETE SET NULL,
  UNIQUE (user_id, distance)
);

-- 6. Colonne running_session_id dans scheduled_events (planning de courses)
ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS running_session_id UUID
    REFERENCES running_sessions(id) ON DELETE SET NULL;

-- =====================================================================
-- Row Level Security
-- =====================================================================

ALTER TABLE running_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own running sessions" ON running_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE running_interval_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own interval blocks" ON running_interval_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM running_sessions rs
      WHERE rs.id = running_interval_blocks.running_session_id
        AND rs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM running_sessions rs
      WHERE rs.id = running_interval_blocks.running_session_id
        AND rs.user_id = auth.uid()
    )
  );

ALTER TABLE running_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own running logs" ON running_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE running_personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own PRs" ON running_personal_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
