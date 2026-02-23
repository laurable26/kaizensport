// Supabase Edge Function - Deno runtime
// Déployée via : supabase functions deploy send-push
// Planifiée toutes les 15 minutes via pg_cron

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@top.app'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (_req) => {
  try {
    const now = new Date()
    const in15 = new Date(now.getTime() + 15 * 60 * 1000)

    const todayDate = now.toISOString().slice(0, 10)
    const nowTime = now.toTimeString().slice(0, 5)
    const in15Time = in15.toTimeString().slice(0, 5)

    // Find events due in the next 15 minutes that haven't been notified
    const { data: events, error } = await supabase
      .from('scheduled_events')
      .select(`
        id, user_id, session_id, workout_id, planned_date, planned_time,
        sessions(name),
        workouts(name)
      `)
      .eq('planned_date', todayDate)
      .gte('planned_time', nowTime)
      .lte('planned_time', in15Time)
      .eq('notification_sent', false)

    if (error) throw error

    for (const event of events ?? []) {
      // Get push subscriptions for this user
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', event.user_id)

      const name = (event.sessions as { name: string } | null)?.name
        ?? (event.workouts as { name: string } | null)?.name
        ?? 'Entraînement'

      const payload = JSON.stringify({
        title: '💪 Il est temps de s\'entraîner !',
        body: name,
        url: event.session_id
          ? `/sessions/${event.session_id}`
          : `/workouts/${event.workout_id}/start`,
      })

      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
        } catch (err) {
          console.error('Failed to send push:', err)
          // If subscription is expired/invalid, clean it up
          if ((err as { statusCode?: number }).statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('subscription', sub.subscription)
          }
        }
      }

      // Mark as sent
      await supabase
        .from('scheduled_events')
        .update({ notification_sent: true })
        .eq('id', event.id)
    }

    return new Response(JSON.stringify({ sent: events?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
