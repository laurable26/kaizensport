-- ============================================================
-- KAIZEN SPORT - Push notifications sociales
-- Triggers Postgres → pg_net → Edge Function send-push-social
-- ============================================================
--
-- PRÉREQUIS (à faire dans Supabase Dashboard avant d'exécuter) :
--
--   1. Activer l'extension pg_net :
--      Dashboard → Database → Extensions → pg_net → Enable
--
--   2. Configurer les paramètres de connexion :
--      Remplacer les deux valeurs ci-dessous par tes vraies valeurs.
--      - SUPABASE_PROJECT_URL  : ex. https://xyzxyz.supabase.co
--      - SUPABASE_SERVICE_KEY  : Dashboard → Settings → API → service_role key
--
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Configuration (MODIFIER CES DEUX VALEURS avant d'exécuter)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- URL du projet Supabase (sans slash final)
  PERFORM set_config('app.supabase_url',     'SUPABASE_PROJECT_URL',  false);
  -- Service role key (pour authentifier l'appel à l'edge function)
  PERFORM set_config('app.service_role_key', 'SUPABASE_SERVICE_KEY',  false);
END $$;

-- ─────────────────────────────────────────────────────────────
-- Stocker les paramètres de façon persistante dans une table
-- dédiée (les set_config ci-dessus ne persistent pas entre sessions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Peupler les valeurs (à re-exécuter après avoir mis les vraies valeurs)
INSERT INTO app_config (key, value)
VALUES
  ('supabase_url',     'SUPABASE_PROJECT_URL'),
  ('service_role_key', 'SUPABASE_SERVICE_KEY')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- RLS : seul le SECURITY DEFINER peut lire (pas exposée aux utilisateurs)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_no_access" ON app_config
  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- Fonction helper : envoyer une push notification sociale
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_social_push(
  p_type             TEXT,
  p_recipient        UUID,
  p_sender_name      TEXT,
  p_session_name     TEXT    DEFAULT NULL,
  p_target_session_id TEXT   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url     TEXT;
  v_key     TEXT;
  v_payload JSONB;
BEGIN
  -- Lire la config depuis app_config
  SELECT value INTO v_url  FROM app_config WHERE key = 'supabase_url';
  SELECT value INTO v_key  FROM app_config WHERE key = 'service_role_key';

  IF v_url IS NULL OR v_url = 'SUPABASE_PROJECT_URL' THEN
    RAISE WARNING 'notify_social_push: supabase_url non configuré dans app_config';
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
    'type',               p_type,
    'recipient_id',       p_recipient,
    'sender_name',        p_sender_name,
    'session_name',       p_session_name,
    'target_session_id',  p_target_session_id
  );

  -- Appel HTTP asynchrone via pg_net (non-bloquant)
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/send-push-social',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    ),
    body    := v_payload::text
  );

EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer le trigger même si pg_net échoue
  RAISE WARNING 'notify_social_push error: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Trigger 1 : Nouvelle demande d'ami
-- friendships INSERT avec status = 'pending'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_friendship_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient   UUID;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Le destinataire = l'autre utilisateur (pas celui qui fait la demande)
  v_recipient := CASE
    WHEN NEW.requester = NEW.user_id_1 THEN NEW.user_id_2
    ELSE NEW.user_id_1
  END;

  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.requester;

  PERFORM notify_social_push('friend_request', v_recipient, v_sender_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friendship_insert ON friendships;
CREATE TRIGGER on_friendship_insert
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION trg_friendship_insert();

-- ─────────────────────────────────────────────────────────────
-- Trigger 2 : Demande d'ami acceptée
-- friendships UPDATE → status = 'accepted'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_friendship_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acceptor_name TEXT;
  v_acceptor_id   UUID;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Celui qui accepte = l'autre (pas le requester)
  v_acceptor_id := CASE
    WHEN NEW.requester = NEW.user_id_1 THEN NEW.user_id_2
    ELSE NEW.user_id_1
  END;

  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_acceptor_name
  FROM public.profiles
  WHERE id = v_acceptor_id;

  -- Notifier celui qui avait envoyé la demande
  PERFORM notify_social_push('friend_accepted', NEW.requester, v_acceptor_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friendship_accepted ON friendships;
CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION trg_friendship_accepted();

-- ─────────────────────────────────────────────────────────────
-- Trigger 3 : Séance partagée (invitation reçue)
-- shared_sessions INSERT
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_session_shared_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inviter_name TEXT;
  v_session_name TEXT;
BEGIN
  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_inviter_name
  FROM public.profiles
  WHERE id = NEW.inviter_id;

  SELECT name
  INTO v_session_name
  FROM public.sessions
  WHERE id = NEW.source_session_id;

  PERFORM notify_social_push(
    'session_shared',
    NEW.invitee_id,
    v_inviter_name,
    v_session_name
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_shared_insert ON shared_sessions;
CREATE TRIGGER on_session_shared_insert
  AFTER INSERT ON shared_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_session_shared_insert();

-- ─────────────────────────────────────────────────────────────
-- Trigger 4 : Séance acceptée par l'invité
-- shared_sessions UPDATE → status = 'accepted'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_session_shared_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitee_name TEXT;
  v_session_name TEXT;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_invitee_name
  FROM public.profiles
  WHERE id = NEW.invitee_id;

  SELECT name
  INTO v_session_name
  FROM public.sessions
  WHERE id = NEW.source_session_id;

  PERFORM notify_social_push(
    'session_accepted',
    NEW.inviter_id,
    v_invitee_name,
    v_session_name,
    NEW.target_session_id::TEXT
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_shared_accepted ON shared_sessions;
CREATE TRIGGER on_session_shared_accepted
  AFTER UPDATE ON shared_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_session_shared_accepted();
