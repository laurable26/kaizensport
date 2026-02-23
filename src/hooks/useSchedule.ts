import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ScheduledEventWithDetails, WeekDay } from '@/types/app'

export function useWeekSchedule(weekStart: Date) {
  const start = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['schedule', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_events')
        .select(`
          *,
          sessions(name),
          workouts(name)
        `)
        .gte('planned_date', start)
        .lte('planned_date', end)
        .order('planned_date')
        .order('planned_time')

      if (error) throw error

      // Build WeekDay array
      const days: WeekDay[] = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(startOfWeek(weekStart, { weekStartsOn: 1 }).getDate() + i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const today = format(new Date(), 'yyyy-MM-dd')

        const events = (data ?? [])
          .filter((e) => e.planned_date === dateStr)
          .map((e): ScheduledEventWithDetails => ({
            id: e.id,
            plannedDate: e.planned_date,
            plannedTime: e.planned_time,
            type: e.session_id ? 'session' : 'workout',
            name: (e.sessions as { name: string } | null)?.name ?? (e.workouts as { name: string } | null)?.name ?? '',
            sessionId: e.session_id ?? undefined,
            workoutId: e.workout_id ?? undefined,
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
