-- ============================================================
-- KAIZEN SPORT - Durée cible par exercice de séance
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

alter table session_exercises
  add column if not exists target_duration_seconds smallint;
