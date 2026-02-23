-- =====================================================================
-- Migration 0009 : Table run_invites (invitations à suivre une course)
-- À exécuter dans le Supabase SQL Editor
-- =====================================================================

CREATE TABLE IF NOT EXISTS run_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_log_id  UUID NOT NULL REFERENCES running_logs(id) ON DELETE CASCADE,
  inviter_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_log_id, invitee_id)
);

ALTER TABLE run_invites ENABLE ROW LEVEL SECURITY;

-- L'expéditeur peut créer une invitation
CREATE POLICY "Inviter can insert run invite" ON run_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Le destinataire peut voir ses invitations
CREATE POLICY "Invitee can read own run invites" ON run_invites
  FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- Le destinataire peut répondre (update status)
CREATE POLICY "Invitee can respond to run invite" ON run_invites
  FOR UPDATE USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);
