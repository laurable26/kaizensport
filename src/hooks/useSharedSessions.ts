import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SharedSession = {
  id: string
  inviter_id: string
  invitee_id: string
  source_session_id: string
  target_session_id: string | null
  suggested_date: string | null
  suggested_time: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  inviter?: { id: string; full_name: string | null; email: string; avatar_url: string | null }
  source_session?: { name: string }
}

// ──────────────────────────────────────────────────────────────────────────
// Invitations reçues (en attente)
// ──────────────────────────────────────────────────────────────────────────
export function usePendingSharedSessions() {
  return useQuery({
    queryKey: ['shared-sessions-pending'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return []

      const { data, error } = await supabase
        .from('shared_sessions')
        .select(`
          *,
          inviter:profiles!shared_sessions_inviter_id_fkey(id, full_name, email, avatar_url),
          source_session:sessions!shared_sessions_source_session_id_fkey(name)
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[usePendingSharedSessions]', error.message)
        return []
      }
      return (data ?? []) as SharedSession[]
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Partages envoyés (par l'inviteur, pour afficher dans l'agenda)
// ──────────────────────────────────────────────────────────────────────────
export function useSentSharedSessions() {
  return useQuery({
    queryKey: ['shared-sessions-sent'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return []

      const { data, error } = await supabase
        .from('shared_sessions')
        .select(`
          *,
          invitee:profiles!shared_sessions_invitee_id_fkey(id, full_name, email, avatar_url),
          source_session:sessions!shared_sessions_source_session_id_fkey(name)
        `)
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[useSentSharedSessions]', error.message)
        return []
      }
      return (data ?? []) as (SharedSession & { invitee?: { id: string; full_name: string | null; email: string; avatar_url: string | null } })[]
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Partages acceptés associés à mes scheduled_events
// (pour afficher les avatars dans l'agenda)
// ──────────────────────────────────────────────────────────────────────────
export function useSessionParticipants(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-participants', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      if (!sessionId) return []

      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return []

      // Cherche les partages acceptés pour cette session (source ou copie)
      const { data, error } = await supabase
        .from('shared_sessions')
        .select(`
          inviter_id,
          invitee_id,
          status,
          inviter:profiles!shared_sessions_inviter_id_fkey(id, full_name, email, avatar_url),
          invitee:profiles!shared_sessions_invitee_id_fkey(id, full_name, email, avatar_url)
        `)
        .or(`source_session_id.eq.${sessionId},target_session_id.eq.${sessionId}`)
        .eq('status', 'accepted')

      if (error) return []

      // Retourne les profils des participants (sauf soi-même)
      const participants: { id: string; full_name: string | null; email: string; avatar_url: string | null }[] = []
      for (const row of data ?? []) {
        const inviter = row.inviter as any
        const invitee = row.invitee as any
        if (inviter && inviter.id !== user.id) participants.push(inviter)
        if (invitee && invitee.id !== user.id) participants.push(invitee)
      }
      // Déduplique par id
      const seen = new Set<string>()
      return participants.filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Envoyer une invitation de séance à un ami
// ──────────────────────────────────────────────────────────────────────────
export function useShareSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      inviteeId,
      suggestedDate,
      suggestedTime,
    }: {
      sessionId: string
      inviteeId: string
      suggestedDate?: string
      suggestedTime?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Non authentifié')

      const { error } = await supabase.from('shared_sessions').insert({
        inviter_id: user.id,
        invitee_id: inviteeId,
        source_session_id: sessionId,
        suggested_date: suggestedDate ?? null,
        suggested_time: suggestedTime ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-sessions-sent'] }),
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Accepter une invitation : copie la séance + exercices dans son compte
// et crée un scheduled_event si une date est suggérée
// ──────────────────────────────────────────────────────────────────────────
export function useAcceptSharedSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invite: SharedSession) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Non authentifié')

      // 1. Lire la session source avec ses exercices
      const { data: sourceSession, error: srcErr } = await supabase
        .from('sessions')
        .select(`
          name,
          notes,
          session_exercises(
            order_index,
            sets_planned,
            rest_seconds,
            target_reps,
            target_duration_seconds,
            target_weight,
            exercise:exercises(
              name,
              muscle_group,
              equipment,
              notes
            )
          )
        `)
        .eq('id', invite.source_session_id)
        .single()

      if (srcErr) throw srcErr

      // 2. Pour chaque exercice dans la session source :
      //    - Chercher si l'invité a déjà un exercice avec le même nom
      //    - Sinon, en créer une copie dans son compte
      const exerciseIds: string[] = []
      const ses = sourceSession as any

      for (const se of (ses.session_exercises ?? []).sort((a: any, b: any) => a.order_index - b.order_index)) {
        const exName = se.exercise?.name
        if (!exName) continue

        // Chercher un exercice existant du même nom chez l'invité
        const { data: existing } = await supabase
          .from('exercises')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', exName)
          .limit(1)
          .single()

        let exerciseId: string

        if (existing) {
          exerciseId = existing.id
        } else {
          // Créer une copie de l'exercice dans le compte de l'invité
          const { data: newEx, error: exErr } = await supabase
            .from('exercises')
            .insert({
              user_id: user.id,
              name: exName,
              muscle_group: se.exercise?.muscle_group ?? null,
              equipment: se.exercise?.equipment ?? null,
              notes: se.exercise?.notes ?? null,
            })
            .select('id')
            .single()

          if (exErr) throw exErr
          exerciseId = newEx.id
        }

        exerciseIds.push(exerciseId)
        // Stocker l'association order_index → exerciseId pour la séance
        ;(se as any)._resolvedId = exerciseId
      }

      // 3. Créer la copie de la séance dans le compte de l'invité
      const inviterName = (invite.inviter as any)?.full_name ?? (invite.inviter as any)?.email ?? 'un ami'
      const { data: newSession, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          name: ses.name,
          notes: ses.notes ? `${ses.notes}\n\n(Partagé par ${inviterName})` : `(Partagé par ${inviterName})`,
        })
        .select('id')
        .single()

      if (sessErr) throw sessErr

      // 4. Créer les session_exercises dans la copie
      if (ses.session_exercises?.length > 0) {
        const seRows = (ses.session_exercises as any[])
          .filter((se) => se._resolvedId)
          .map((se, i) => ({
            session_id: newSession.id,
            exercise_id: se._resolvedId,
            order_index: se.order_index ?? i,
            sets_planned: se.sets_planned,
            rest_seconds: se.rest_seconds,
            target_reps: se.target_reps ?? null,
            target_duration_seconds: se.target_duration_seconds ?? null,
            target_weight: se.target_weight ?? null,
          }))

        const { error: seErr } = await supabase.from('session_exercises').insert(seRows)
        if (seErr) throw seErr
      }

      // 5. Créer un scheduled_event si une date est suggérée
      if (invite.suggested_date) {
        await supabase.from('scheduled_events').insert({
          user_id: user.id,
          session_id: newSession.id,
          planned_date: invite.suggested_date,
          planned_time: invite.suggested_time ?? null,
        })
      }

      // 6. Mettre à jour le statut + target_session_id dans shared_sessions
      const { error: updateErr } = await supabase
        .from('shared_sessions')
        .update({
          status: 'accepted',
          target_session_id: newSession.id,
        })
        .eq('id', invite.id)

      if (updateErr) throw updateErr

      return newSession.id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shared-sessions-pending'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Décliner une invitation
// ──────────────────────────────────────────────────────────────────────────
export function useDeclineSharedSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('shared_sessions')
        .update({ status: 'declined' })
        .eq('id', inviteId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-sessions-pending'] }),
  })
}
