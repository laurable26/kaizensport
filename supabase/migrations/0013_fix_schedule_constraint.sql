-- =====================================================================
-- Migration 0013 : Autoriser running_session_id dans scheduled_events
-- La contrainte initiale n'acceptait que session_id ou workout_id.
-- À exécuter dans le Supabase SQL Editor.
-- =====================================================================

ALTER TABLE scheduled_events DROP CONSTRAINT IF EXISTS one_type;

ALTER TABLE scheduled_events ADD CONSTRAINT one_type CHECK (
  (session_id IS NOT NULL AND workout_id IS NULL AND running_session_id IS NULL) OR
  (workout_id IS NOT NULL AND session_id IS NULL AND running_session_id IS NULL) OR
  (running_session_id IS NOT NULL AND session_id IS NULL AND workout_id IS NULL)
);
