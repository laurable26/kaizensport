-- =====================================================================
-- Migration 0017 : Partage de plans de course entre amis
-- Reproduit le système shared_sessions (muscu) pour les running_sessions.
-- À exécuter dans le Supabase Dashboard → SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS shared_running_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_session_id UUID        NOT NULL REFERENCES running_sessions(id) ON DELETE CASCADE,
  target_session_id UUID        REFERENCES running_sessions(id) ON DELETE SET NULL,
  suggested_date    DATE        DEFAULT NULL,
  suggested_time    TIME        DEFAULT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inviter_id, invitee_id, source_session_id)
);

ALTER TABLE shared_running_sessions ENABLE ROW LEVEL SECURITY;

-- L'inviteur peut insérer et voir ses propres partages
DROP POLICY IF EXISTS "srs_inviter" ON shared_running_sessions;
CREATE POLICY "srs_inviter" ON shared_running_sessions
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- L'invité peut voir et mettre à jour (accepter/refuser) les invitations reçues
DROP POLICY IF EXISTS "srs_invitee" ON shared_running_sessions;
CREATE POLICY "srs_invitee" ON shared_running_sessions
  USING (invitee_id = auth.uid());
