-- ============================================================
-- KAIZEN SPORT - Partage de séances entre amis
-- Chaque invité reçoit sa propre copie de la séance
-- et la gère indépendamment dans son propre espace.
-- ============================================================

-- Table de partage : lien entre l'inviteur et l'invité
-- avec référence à la session originale et la copie créée
CREATE TABLE IF NOT EXISTS shared_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Session de référence (celle de l'inviteur, lecture seule pour l'invité)
  source_session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  -- Copie créée dans le compte de l'invité (null = invitation en attente)
  target_session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  -- Date planifiée par l'inviteur pour suggérer une date
  suggested_date      DATE,
  suggested_time      TIME,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_session_id, invitee_id)
);

ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;

-- L'inviteur peut créer et voir ses partages
CREATE POLICY "shared_sessions_inviter_all" ON shared_sessions
  FOR ALL USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

-- L'invité peut voir et mettre à jour (accepter/refuser)
CREATE POLICY "shared_sessions_invitee_select" ON shared_sessions
  FOR SELECT USING (auth.uid() = invitee_id);

CREATE POLICY "shared_sessions_invitee_update" ON shared_sessions
  FOR UPDATE USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_shared_sessions_invitee ON shared_sessions (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_inviter ON shared_sessions (inviter_id);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_source ON shared_sessions (source_session_id);

-- Realtime pour les notifications d'invitation
ALTER PUBLICATION supabase_realtime ADD TABLE shared_sessions;

-- ────────────────────────────────────────────────────────────
-- Permettre à l'inviteur de lire les exercices des sessions
-- partagées (pour copier dans le compte de l'invité)
-- ────────────────────────────────────────────────────────────

-- Les session_exercises des sessions partagées sont lisibles
-- par l'inviteur/invité (pour permettre la copie)
CREATE POLICY "shared_session_exercises_read" ON session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM shared_sessions ss
      WHERE ss.source_session_id = session_id
        AND (ss.inviter_id = auth.uid() OR ss.invitee_id = auth.uid())
    )
  );

-- Les exercices partagés doivent être accessibles (lecture) par les invités
-- pour que la copie client-side puisse lire les détails
CREATE POLICY "shared_exercises_read" ON exercises
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM shared_sessions ss
      JOIN sessions s ON s.id = ss.source_session_id
      JOIN session_exercises se ON se.session_id = s.id
      WHERE se.exercise_id = exercises.id
        AND (ss.inviter_id = auth.uid() OR ss.invitee_id = auth.uid())
    )
  );
