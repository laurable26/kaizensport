import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PR_DISTANCES } from '@/types/app'
import type { RunningSessionWithBlocks, RunningLogWithSession, GpsPoint } from '@/types/app'
import type {
  RunningSession,
  RunningSessionInsert,
  RunningIntervalBlock,
  RunningIntervalBlockInsert,
  RunningLog,
  RunningPersonalRecord,
} from '@/types/database'

// ── Sessions (plans de course) ────────────────────────────────────────────────

export function useRunningSessions() {
  return useQuery({
    queryKey: ['running-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('running_sessions')
        .select('*, running_interval_blocks(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as RunningSessionWithBlocks[]
    },
  })
}

export function useRunningSession(id: string | undefined) {
  return useQuery({
    queryKey: ['running-session', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('running_sessions')
        .select('*, running_interval_blocks(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      // Trier les blocs par order_index
      const result = data as RunningSessionWithBlocks
      result.running_interval_blocks = (result.running_interval_blocks ?? [])
        .sort((a, b) => a.order_index - b.order_index)
      return result
    },
    enabled: !!id,
  })
}

export function useCreateRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      session,
      blocks,
    }: {
      session: Omit<RunningSessionInsert, 'user_id'>
      blocks: Omit<RunningIntervalBlockInsert, 'running_session_id'>[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newSession, error } = await supabase
        .from('running_sessions')
        .insert({ ...session, user_id: user.id })
        .select()
        .single()
      if (error) throw error

      if (blocks.length > 0) {
        const { error: bErr } = await supabase
          .from('running_interval_blocks')
          .insert(
            blocks.map((b, i) => ({
              ...b,
              running_session_id: newSession.id,
              order_index: i,
            }))
          )
        if (bErr) throw bErr
      }

      return newSession as RunningSession
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['running-sessions'] }),
  })
}

export function useUpdateRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      session,
      blocks,
    }: {
      id: string
      session: Partial<Omit<RunningSessionInsert, 'user_id'>>
      blocks: Omit<RunningIntervalBlockInsert, 'running_session_id'>[]
    }) => {
      const { error } = await supabase
        .from('running_sessions')
        .update({ ...session, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      // Remplace tous les blocs
      await supabase.from('running_interval_blocks').delete().eq('running_session_id', id)

      if (blocks.length > 0) {
        const { error: bErr } = await supabase.from('running_interval_blocks').insert(
          blocks.map((b, i) => ({ ...b, running_session_id: id, order_index: i }))
        )
        if (bErr) throw bErr
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['running-sessions'] })
      qc.invalidateQueries({ queryKey: ['running-session', id] })
    },
  })
}

export function useDeleteRunningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('running_sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['running-sessions'] }),
  })
}

// ── Logs de courses ───────────────────────────────────────────────────────────

export function useRunningLogs(limit = 50) {
  return useQuery({
    queryKey: ['running-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('running_logs')
        .select(`
          id, user_id, running_session_id, started_at, completed_at,
          distance_m, duration_s, avg_pace_s_per_km, best_pace_s_per_km,
          elevation_gain_m, overall_feeling, notes,
          running_sessions(name, type)
        `)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data as unknown) as RunningLogWithSession[]
    },
  })
}

export function useRunningLogDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['running-log', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('running_logs')
        .select('*, running_sessions(name, type)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as RunningLog & { running_sessions: Pick<RunningSession, 'name' | 'type'> | null }
    },
    enabled: !!id,
  })
}

export function useStartRunningLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runningSessionId: string | null) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('running_logs')
        .insert({
          user_id: user.id,
          running_session_id: runningSessionId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data as RunningLog
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['running-logs'] }),
  })
}

export function useCompleteRunningLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      distanceM: number
      durationS: number
      avgPaceSecPerKm: number | null
      bestPaceSecPerKm: number | null
      elevationGainM: number
      gpsTrack: GpsPoint[]
      overallFeeling?: number | null
      notes?: string | null
    }) => {
      const { error } = await supabase
        .from('running_logs')
        .update({
          completed_at: new Date().toISOString(),
          distance_m: payload.distanceM,
          duration_s: payload.durationS,
          avg_pace_s_per_km: payload.avgPaceSecPerKm,
          best_pace_s_per_km: payload.bestPaceSecPerKm,
          elevation_gain_m: payload.elevationGainM,
          gps_track: payload.gpsTrack as unknown as Record<string, unknown>[],
          overall_feeling: payload.overallFeeling ?? null,
          notes: payload.notes ?? null,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['running-logs'] })
      qc.invalidateQueries({ queryKey: ['running-stats'] })
    },
  })
}

// ── Records personnels ────────────────────────────────────────────────────────

export function useRunningPRs() {
  return useQuery({
    queryKey: ['running-prs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('running_personal_records')
        .select('*')
        .order('distance')
      if (error) throw error
      return data as RunningPersonalRecord[]
    },
  })
}

/**
 * Vérifie si une course complète un record sur les distances standards.
 * Upsert le PR si battu.
 */
export function useCheckAndSavePR() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      runningLogId,
      distanceM,
      durationS,
    }: {
      runningLogId: string
      distanceM: number
      durationS: number
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return [] as string[]

      const newPRs: string[] = []
      const paceSecPerM = durationS / distanceM

      for (const [key, metres] of Object.entries(PR_DISTANCES)) {
        // La course doit être au moins 99% de la distance standard
        if (distanceM < metres * 0.99) continue

        // Extrapolation linéaire : temps estimé sur la distance standard
        const estimatedSec = Math.round(paceSecPerM * metres)

        const { data: existing } = await supabase
          .from('running_personal_records')
          .select('duration_s')
          .eq('user_id', user.id)
          .eq('distance', key)
          .maybeSingle()

        if (!existing || estimatedSec < existing.duration_s) {
          await supabase
            .from('running_personal_records')
            .upsert(
              {
                user_id: user.id,
                distance: key as RunningPersonalRecord['distance'],
                duration_s: estimatedSec,
                achieved_at: new Date().toISOString(),
                running_log_id: runningLogId,
              },
              { onConflict: 'user_id,distance' }
            )
          newPRs.push(key)
        }
      }

      return newPRs
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['running-prs'] }),
  })
}

// ── Statistiques de course ────────────────────────────────────────────────────

export function useRunningStats() {
  return useQuery({
    queryKey: ['running-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('running_logs')
        .select('distance_m, duration_s, avg_pace_s_per_km, started_at, completed_at')
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(100)
      if (error) throw error

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const thisWeek = (data ?? []).filter(
        (l) => new Date(l.started_at) >= weekAgo
      )

      const totalKmThisWeek = thisWeek.reduce((a, l) => a + (l.distance_m ?? 0), 0) / 1000
      const bestPaceThisWeek = thisWeek.reduce<number | null>((best, l) => {
        if (!l.avg_pace_s_per_km) return best
        return best === null ? l.avg_pace_s_per_km : Math.min(best, l.avg_pace_s_per_km)
      }, null)

      return {
        runsThisWeek: thisWeek.length,
        totalKmThisWeek,
        bestPaceThisWeek,
        allLogs: data ?? [],
      }
    },
  })
}
