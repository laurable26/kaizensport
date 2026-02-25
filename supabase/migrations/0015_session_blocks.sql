-- =====================================================================
-- Migration 0015 : Modèle bloc-centré pour les séances muscu
-- Un bloc = N séries contenant X exercices en séquence (superset / circuit)
-- Un bloc à 1 exercice = comportement actuel (rétrocompatible)
-- À exécuter dans le Supabase SQL Editor.
-- =====================================================================

-- ── 1. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_blocks (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  block_index          SMALLINT     NOT NULL DEFAULT 0,
  label                TEXT         DEFAULT NULL,
  rounds               SMALLINT     NOT NULL DEFAULT 3,
  rest_between_rounds_s SMALLINT    NOT NULL DEFAULT 90
);

CREATE TABLE IF NOT EXISTS session_block_exercises (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id         UUID         NOT NULL REFERENCES session_blocks(id) ON DELETE CASCADE,
  exercise_id      UUID         NOT NULL REFERENCES exercises(id),
  order_index      SMALLINT     NOT NULL DEFAULT 0,
  rep_mode         TEXT         NOT NULL DEFAULT 'reps' CHECK (rep_mode IN ('reps', 'duration')),
  target_reps      SMALLINT     DEFAULT NULL,
  target_duration_s SMALLINT   DEFAULT NULL,
  target_weight    NUMERIC(6,2) DEFAULT NULL,
  rest_after_s     SMALLINT     NOT NULL DEFAULT 0
);

-- ── 2. Row-Level Security ──────────────────────────────────────────────────

ALTER TABLE session_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_block_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_blocks_owner" ON session_blocks;
CREATE POLICY "session_blocks_owner" ON session_blocks
  USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "session_block_exercises_owner" ON session_block_exercises;
CREATE POLICY "session_block_exercises_owner" ON session_block_exercises
  USING (
    block_id IN (
      SELECT sb.id FROM session_blocks sb
      JOIN sessions s ON s.id = sb.session_id
      WHERE s.user_id = auth.uid()
    )
  );

-- ── 3. Migration données existantes ───────────────────────────────────────
-- Chaque ligne session_exercises → 1 bloc mono-exercice
-- (sets_planned → rounds, rest_seconds → rest_between_rounds_s)

INSERT INTO session_blocks (session_id, block_index, rounds, rest_between_rounds_s)
SELECT session_id, order_index, sets_planned, rest_seconds
FROM session_exercises
ON CONFLICT DO NOTHING;

INSERT INTO session_block_exercises (
  block_id, exercise_id, order_index, rep_mode,
  target_reps, target_duration_s, target_weight
)
SELECT
  sb.id,
  se.exercise_id,
  0,
  CASE WHEN se.target_duration_seconds IS NOT NULL THEN 'duration' ELSE 'reps' END,
  se.target_reps,
  se.target_duration_seconds,
  se.target_weight
FROM session_exercises se
JOIN session_blocks sb
  ON sb.session_id = se.session_id
  AND sb.block_index = se.order_index
ON CONFLICT DO NOTHING;

-- ── 4. Enrichir set_logs pour le suivi round + bloc ───────────────────────

ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES session_blocks(id);
ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS round_number SMALLINT DEFAULT 1;
