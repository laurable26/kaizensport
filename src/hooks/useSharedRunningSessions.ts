import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SharedRunningSession = {
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
export function usePendingSharedRunningSessions() {
  return useQuery({
    queryKey: ['shared-running-sessions-pending'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return []

      const { data, error } = await supabase
        .from('shared_running_sessions')
        .select(`
          *,
          inviter:profiles!shared_running_sessions_inviter_id_fkey(id, full_name, email, avatar_url),
          source_session:running_sessions!shared_running_sessions_source_session_id_fkey(name)
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[usePendingSharedRunningSessions]', error.message)
        return []
      }
      return (data ?? []) as SharedRunningSession[]
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Envoyer une invitation de plan de course à un ami
// ──────────────────────────────────────────────────────────────────────────
export function useShareRunningSession() {
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

      const { error } = await supabase.from('shared_running_sessions').insert({
        inviter_id: user.id,
        invitee_id: inviteeId,
        source_session_id: sessionId,
        suggested_date: suggestedDate ?? null,
        suggested_time: suggestedTime ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-running-sessions-sent'] }),
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Accepter une invitation : copie le plan de course + blocs dans son compte
// ──────────────────────────────────────────────────────────────────────────
export function useAcceptSharedRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invite: SharedRunningSession) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Non authentifié')

      // 1. Lire le plan source avec ses blocs d'intervalles
      const { data: sourceSession, error: srcErr } = await supabase
        .from('running_sessions')
        .select(`
          name,
          type,
          target_distance_m,
          target_duration_s,
          warmup_duration_s,
          cooldown_duration_s,
          notes,
          running_interval_blocks(
            order_index,
            label,
            phase,
            duration_s,
            target_pace_min_km,
            repetitions
          )
        `)
        .eq('id', invite.source_session_id)
        .single()

      if (srcErr) throw srcErr

      const src = sourceSession as any
      const inviterName = (invite.inviter as any)?.full_name ?? (invite.inviter as any)?.email ?? 'un ami'

      // 2. Créer la copie du plan dans le compte de l'invité
      const { data: newSession, error: sessErr } = await supabase
        .from('running_sessions')
        .insert({
          user_id: user.id,
          name: src.name,
          type: src.type,
          target_distance_m: src.target_distance_m ?? null,
          target_duration_s: src.target_duration_s ?? null,
          warmup_duration_s: src.warmup_duration_s ?? null,
          cooldown_duration_s: src.cooldown_duration_s ?? null,
          notes: src.notes
            ? `${src.notes}\n\n(Partagé par ${inviterName})`
            : `(Partagé par ${inviterName})`,
        })
        .select('id')
        .single()

      if (sessErr) throw sessErr

      // 3. Copier les blocs d'intervalles
      const intervalBlocks = (src.running_interval_blocks ?? []) as any[]
      if (intervalBlocks.length > 0) {
        const { error: blocksErr } = await supabase
          .from('running_interval_blocks')
          .insert(
            intervalBlocks.map((b) => ({
              running_session_id: newSession.id,
              order_index: b.order_index,
              label: b.label ?? null,
              phase: b.phase,
              duration_s: b.duration_s,
              target_pace_min_km: b.target_pace_min_km ?? null,
              repetitions: b.repetitions,
            }))
          )
        if (blocksErr) throw blocksErr
      }

      // 4. Créer un scheduled_event si une date est suggérée
      if (invite.suggested_date) {
        await supabase.from('scheduled_events').insert({
          user_id: user.id,
          running_session_id: newSession.id,
          planned_date: invite.suggested_date,
          planned_time: invite.suggested_time ?? null,
        })
      }

      // 5. Mettre à jour le statut + target_session_id
      const { error: updateErr } = await supabase
        .from('shared_running_sessions')
        .update({
          status: 'accepted',
          target_session_id: newSession.id,
        })
        .eq('id', invite.id)

      if (updateErr) throw updateErr

      return newSession.id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shared-running-sessions-pending'] })
      qc.invalidateQueries({ queryKey: ['running-sessions'] })
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Décliner une invitation
// ──────────────────────────────────────────────────────────────────────────
export function useDeclineSharedRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('shared_running_sessions')
        .update({ status: 'declined' })
        .eq('id', inviteId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-running-sessions-pending'] }),
  })
}
