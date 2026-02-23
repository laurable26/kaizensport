// Supabase Edge Function - Deno runtime
// Appelée via pg_net depuis des triggers Postgres
// quand un événement social survient (ami, partage séance, etc.)
//
// Déploiement : supabase functions deploy send-push-social
//
// Body attendu :
// {
//   type: 'friend_request' | 'friend_accepted' | 'session_shared' | 'session_accepted',
//   recipient_id: string,        // UUID de l'utilisateur destinataire
//   sender_name: string,         // Nom de l'expéditeur
//   session_name?: string,       // Nom de la séance (pour session_shared)
//   target_session_id?: string,  // ID de la séance copiée (pour session_accepted)
// }

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@kaizensport.app'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type NotifType =
  | 'friend_request'
  | 'friend_accepted'
  | 'session_shared'
  | 'session_accepted'

interface PushBody {
  type: NotifType
  recipient_id: string
  sender_name: string
  session_name?: string
  target_session_id?: string
}

function buildPayload(body: PushBody): { title: string; body: string; url: string; icon: string; badge: string } {
  const base = { icon: '/icons/logo.svg', badge: '/icons/logo.svg' }

  switch (body.type) {
    case 'friend_request':
      return {
        ...base,
        title: '👋 Nouvelle demande d\'ami',
        body: `${body.sender_name} veut t'ajouter comme ami`,
        url: '/friends',
      }
    case 'friend_accepted':
      return {
        ...base,
        title: '🤝 Demande acceptée !',
        body: `${body.sender_name} a accepté ta demande d'ami`,
        url: '/friends',
      }
    case 'session_shared':
      return {
        ...base,
        title: '💪 Séance partagée !',
        body: `${body.sender_name} te partage « ${body.session_name ?? 'une séance'} »`,
        url: '/friends',
      }
    case 'session_accepted':
      return {
        ...base,
        title: '✅ Séance acceptée !',
        body: `${body.sender_name} a rejoint ta séance « ${body.session_name ?? ''} »`,
        url: body.target_session_id ? `/sessions/${body.target_session_id}` : '/sessions',
      }
    default:
      return {
        ...base,
        title: 'Kaizen Sport',
        body: 'Nouvelle notification',
        url: '/',
      }
  }
}

async function sendToUser(userId: string, payloadObj: ReturnType<typeof buildPayload>) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return 0

  let sent = 0
  const payload = JSON.stringify(payloadObj)

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
      sent++
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      console.error(`Push failed for sub ${sub.id}:`, statusCode, String(err))
      // Nettoyer les abonnements expirés (410 Gone) ou invalides (404)
      if (statusCode === 410 || statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
  return sent
}

Deno.serve(async (req) => {
  // Accepter seulement POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await req.json() as PushBody

    if (!body.recipient_id || !body.type || !body.sender_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipient_id, type, sender_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payloadObj = buildPayload(body)
    const sent = await sendToUser(body.recipient_id, payloadObj)

    console.log(`[send-push-social] type=${body.type} recipient=${body.recipient_id} sent=${sent}`)

    return new Response(
      JSON.stringify({ ok: true, sent }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-push-social] Error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
