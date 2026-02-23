-- ============================================================
-- KAIZEN SPORT - Push notifications sociales
-- Triggers Postgres → pg_net → Edge Function send-push-social
-- ============================================================
--
-- PRÉREQUIS :
--   1. L'extension pg_net doit être activée dans Supabase
--      (Dashboard → Database → Extensions → pg_net → Enable)
--   2. L'edge function send-push-social doit être déployée
--   3. Les variables d'env VAPID doivent être configurées
--      dans l'edge function
--
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Fonction helper : appeler l'edge function send-push-social
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_social_push(
  p_type        TEXT,
  p_recipient   UUID,
  p_sender_name TEXT,
  p_session_name TEXT DEFAULT NULL,
  p_target_session_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url     TEXT;
  v_payload JSONB;
  v_key     TEXT;
BEGIN
  -- URL de l'edge function (à adapter si domaine Supabase différent)
  v_url := current_setting('app.supabase_url', true)
            || '/functions/v1/send-push-social';

  -- Fallback : lire depuis la variable d'environnement Supabase
  IF v_url IS NULL OR v_url = '/functions/v1/send-push-social' THEN
    v_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1)
              || '/functions/v1/send-push-social';
  END IF;

  v_payload := jsonb_build_object(
    'type',              p_type,
    'recipient_id',      p_recipient,
    'sender_name',       p_sender_name,
    'session_name',      p_session_name,
    'target_session_id', p_target_session_id
  );

  v_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1);

  -- Appel HTTP asynchrone via pg_net
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    ),
    body    := v_payload::text
  );

EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer le trigger même si pg_net échoue
  RAISE WARNING 'notify_social_push failed: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Trigger 1 : Nouvelle demande d'ami reçue
-- friendships INSERT avec status='pending'
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
  -- Seulement si c'est une nouvelle demande pending
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- L'autre utilisateur reçoit la notif
  v_recipient := CASE
    WHEN NEW.requester = NEW.user_id_1 THEN NEW.user_id_2
    ELSE NEW.user_id_1
  END;

  -- Nom de l'expéditeur
  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.requester;

  PERFORM notify_social_push(
    'friend_request',
    v_recipient,
    v_sender_name
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friendship_insert ON friendships;
CREATE TRIGGER on_friendship_insert
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION trg_friendship_insert();

-- ─────────────────────────────────────────────────────────────
-- Trigger 2 : Demande d'ami acceptée
-- friendships UPDATE status → 'accepted'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_friendship_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient   UUID;
BEGIN
  -- Seulement quand le statut passe à 'accepted'
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Celui qui a accepté notifie l'expéditeur original
  v_recipient := NEW.requester;

  -- Nom de celui qui accepte (l'autre)
  DECLARE
    v_acceptor UUID := CASE
      WHEN NEW.requester = NEW.user_id_1 THEN NEW.user_id_2
      ELSE NEW.user_id_1
    END;
  BEGIN
    SELECT COALESCE(full_name, email, 'Quelqu''un')
    INTO v_sender_name
    FROM public.profiles
    WHERE id = v_acceptor;
  END;

  PERFORM notify_social_push(
    'friend_accepted',
    v_recipient,
    v_sender_name
  );

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
  v_sender_name  TEXT;
  v_session_name TEXT;
BEGIN
  -- Nom de l'inviteur
  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.inviter_id;

  -- Nom de la séance
  SELECT name
  INTO v_session_name
  FROM public.sessions
  WHERE id = NEW.source_session_id;

  PERFORM notify_social_push(
    'session_shared',
    NEW.invitee_id,
    v_sender_name,
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
-- Trigger 4 : Séance partagée acceptée
-- shared_sessions UPDATE status → 'accepted'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_session_shared_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name  TEXT;
  v_session_name TEXT;
BEGIN
  -- Seulement quand le statut passe à 'accepted'
  IF OLD.status = NEW.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Nom de l'invité (celui qui accepte)
  SELECT COALESCE(full_name, email, 'Quelqu''un')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.invitee_id;

  -- Nom de la séance source
  SELECT name
  INTO v_session_name
  FROM public.sessions
  WHERE id = NEW.source_session_id;

  PERFORM notify_social_push(
    'session_accepted',
    NEW.inviter_id,
    v_sender_name,
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
