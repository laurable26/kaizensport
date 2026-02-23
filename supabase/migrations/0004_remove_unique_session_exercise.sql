-- ============================================================
-- KAIZEN SPORT - Permettre le même exercice plusieurs fois dans une séance
-- Coller ce fichier dans Supabase > SQL Editor > Run
-- ============================================================

-- Supprimer la contrainte unique sur (session_id, exercise_id)
alter table session_exercises
  drop constraint if exists session_exercises_session_id_exercise_id_key;

-- Ajouter un order_index auto-incrémenté pour l'ordre
-- (order_index existe déjà, juste s'assurer qu'il n'y a plus de contrainte unique)
