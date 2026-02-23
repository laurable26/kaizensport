import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ScheduledEventWithDetails, ScheduledEventParticipant, WeekDay } from '@/types/app'

export function useWeekSchedule(weekStart: Date) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['schedule', start, end],
    queryFn: async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const userId = authSession?.user?.id

      const [eventsRes, sharedRes] = await Promise.all([
        supabase
          .from('scheduled_events')
          .select('*, sessions(name), workouts(name)')
          .gte('planned_date', start)
          .lte('planned_date', end)
          .order('planned_date')
          .order('planned_time'),

        // Partages acceptés pour récupérer les participants par session_id
        userId
          ? supabase
              .from('shared_sessions')
              .select(`
                source_session_id,
                target_session_id,
                inviter_id,
                invitee_id,
                inviter:profiles!shared_sessions_inviter_id_fkey(id, full_name, email, avatar_url),
                invitee:profiles!shared_sessions_invitee_id_fkey(id, full_name, email, avatar_url)
              `)
              .eq('status', 'accepted')
              .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (eventsRes.error) throw eventsRes.error

      // Construire un map sessionId → participants (autres que soi)
      const participantsMap: Record<string, ScheduledEventParticipant[]> = {}
      for (const row of ((sharedRes.data ?? []) as any[])) {
        const inviter = row.inviter as ScheduledEventParticipant | null
        const invitee = row.invitee as ScheduledEventParticipant | null

        // Associer aux deux session IDs (source et target)
        const relatedIds = [row.source_session_id, row.target_session_id].filter(Boolean) as string[]
        for (const sid of relatedIds) {
          if (!participantsMap[sid]) participantsMap[sid] = []
          if (inviter && inviter.id !== userId) {
            if (!participantsMap[sid].find((p) => p.id === inviter.id)) {
              participantsMap[sid].push(inviter)
            }
          }
          if (invitee && invitee.id !== userId) {
            if (!participantsMap[sid].find((p) => p.id === invitee.id)) {
              participantsMap[sid].push(invitee)
            }
          }
        }
      }

      // Build WeekDay array
      const days: WeekDay[] = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(startOfWeek(weekStart, { weekStartsOn: 1 }).getDate() + i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const today = format(new Date(), 'yyyy-MM-dd')

        const events = (eventsRes.data ?? [])
          .filter((e) => e.planned_date === dateStr)
          .map((e): ScheduledEventWithDetails => ({
            id: e.id,
            plannedDate: e.planned_date,
            plannedTime: e.planned_time,
            type: e.session_id ? 'session' : 'workout',
            name: (e.sessions as { name: string } | null)?.name ?? (e.workouts as { name: string } | null)?.name ?? '',
            sessionId: e.session_id ?? undefined,
            workoutId: e.workout_id ?? undefined,
            participants: e.session_id ? (participantsMap[e.session_id] ?? []) : [],
          }))

        days.push({
          date,
          label: format(date, 'EEE d', { locale: fr }),
          isToday: dateStr === today,
          events,
        })
      }

      return days
    },
  })
}

export function useScheduleEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      workoutId,
      plannedDate,
      plannedTime,
    }: {
      sessionId?: string
      workoutId?: string
      plannedDate: string
      plannedTime?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('scheduled_events')
        .insert({
          user_id: user.id,
          session_id: sessionId ?? null,
          workout_id: workoutId ?? null,
          planned_date: plannedDate,
          planned_time: plannedTime ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}

/** Retourne le nombre de séances planifiées avant aujourd'hui qui n'ont pas été effectuées */
export function useSkippedSessions() {
  return useQuery({
    queryKey: ['skipped-sessions'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: events, error } = await supabase
        .from('scheduled_events')
        .select('id, session_id, planned_date')
        .lt('planned_date', today)
        .not('session_id', 'is', null)

      if (error) throw error
      if (!events || events.length === 0) return 0

      // Vérifie quels sessions_id ont été effectuées (ont un session_log complété)
      const sessionIds = [...new Set(events.map((e) => e.session_id).filter(Boolean))]
      const { data: logs } = await supabase
        .from('session_logs')
        .select('session_id')
        .in('session_id', sessionIds)
        .not('completed_at', 'is', null)

      const completedSessionIds = new Set((logs ?? []).map((l) => l.session_id))

      // Séances planifiées dont la session n'a jamais été effectuée
      const skipped = events.filter((e) => !completedSessionIds.has(e.session_id)).length
      return skipped
    },
  })
}

export function useDeleteScheduledEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}

export function useUpdateScheduledEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, plannedTime }: { id: string; plannedTime: string | null }) => {
      const { error } = await supabase
        .from('scheduled_events')
        .update({ planned_time: plannedTime })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  })
}
