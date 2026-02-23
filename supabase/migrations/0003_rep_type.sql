-- ============================================================
-- KAIZEN SPORT - Rep type (reps ou secondes) par exercice de séance
-- Coller ce fichier dans Supabase > SQL Editor > Run
-- ============================================================

alter table session_exercises
  add column if not exists rep_type text not null default 'reps'
    check (rep_type in ('reps', 'seconds'));
