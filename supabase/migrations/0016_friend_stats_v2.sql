-- =====================================================================
-- Migration 0016 : Mise à jour des stats d'amis
-- Ajoute sessions_this_week et weekly_duration_s à get_friend_stats().
-- À exécuter dans le Supabase Dashboard → SQL Editor.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_friend_stats(p_friend_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_is_friend  BOOLEAN;
  v_week_start TIMESTAMPTZ := date_trunc('week', NOW());
  v_muscu      JSON;
  v_running    JSON;
BEGIN
  -- Vérifier l'amitié acceptée entre l'utilisateur courant et p_friend_id
  SELECT EXISTS(
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND ((user_id_1 = v_user_id AND user_id_2 = p_friend_id)
      OR (user_id_2 = v_user_id AND user_id_1 = p_friend_id))
  ) INTO v_is_friend;

  IF NOT v_is_friend THEN RETURN NULL; END IF;

  -- Stats musculation (inclut cette semaine + durée semaine)
  SELECT json_build_object(
    'total_sessions',     COUNT(*),
    'sessions_this_week', COUNT(*) FILTER (WHERE started_at >= v_week_start),
    'weekly_duration_s',  COALESCE(
                            SUM(
                              EXTRACT(EPOCH FROM (completed_at - started_at))
                            ) FILTER (WHERE started_at >= v_week_start AND completed_at IS NOT NULL),
                            0
                          ),
    'last_session_at',    MAX(completed_at)
  ) INTO v_muscu
  FROM session_logs
  WHERE user_id = p_friend_id AND completed_at IS NOT NULL;

  -- Stats running (inchangées)
  SELECT json_build_object(
    'total_runs',       COUNT(*),
    'total_distance_m', COALESCE(SUM(distance_m), 0),
    'total_duration_s', COALESCE(SUM(duration_s), 0),
    'last_run_at',      MAX(completed_at)
  ) INTO v_running
  FROM running_logs
  WHERE user_id = p_friend_id AND completed_at IS NOT NULL;

  RETURN json_build_object('muscu', v_muscu, 'running', v_running);
END; $$;
