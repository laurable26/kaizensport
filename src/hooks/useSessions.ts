import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Session, SessionInsert } from '@/types/database'
import type { SessionWithExercises } from '@/types/app'

type ExerciseIdPayload = {
  id: string
  setsPlanned: number
  restSeconds: number
  targetReps?: number | null
  targetDurationSeconds?: number | null
  targetWeight?: number | null
}

export type SessionWithMeta = Session & {
  session_exercises: {
    sets_planned: number
    rest_seconds: number
    target_reps: number | null
    target_duration_seconds: number | null
  }[]
}

/** Estime la durée d'une séance en minutes */
export function estimateSessionDuration(exercises: { sets_planned: number; rest_seconds: number; target_reps: number | null; target_duration_seconds: number | null }[]): number {
  return Math.round(exercises.reduce((acc, ex) => {
    const setTime = ex.target_duration_seconds ?? 45 // 45s par série par défaut en mode reps
    return acc + ex.sets_planned * (setTime + ex.rest_seconds)
  }, 0) / 60)
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          session_exercises(sets_planned, rest_seconds, target_reps, target_duration_seconds)
        `)
        .order('name')
      if (error) throw error
      return data as SessionWithMeta[]
    },
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          session_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as SessionWithExercises
    },
    enabled: !!id,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      session,
      exerciseIds,
    }: {
      session: Omit<SessionInsert, 'user_id'>
      exerciseIds: ExerciseIdPayload[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({ ...session, user_id: user.id })
        .select()
        .single()
      if (error) throw error

      if (exerciseIds.length > 0) {
        const { error: seError } = await supabase.from('session_exercises').insert(
          exerciseIds.map((ex, i) => ({
            session_id: newSession.id,
            exercise_id: ex.id,
            order_index: i,
            sets_planned: ex.setsPlanned,
            rest_seconds: ex.restSeconds,
            target_reps: ex.targetReps ?? null,
            target_duration_seconds: ex.targetDurationSeconds ?? null,
            target_weight: ex.targetWeight ?? null,
          }))
        )
        if (seError) throw seError
      }

      return newSession as Session
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      session,
      exerciseIds,
    }: {
      id: string
      session: { name: string; notes?: string | null }
      exerciseIds: ExerciseIdPayload[]
    }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ name: session.name, notes: session.notes ?? null })
        .eq('id', id)
      if (error) throw error

      // Replace all session_exercises
      await supabase.from('session_exercises').delete().eq('session_id', id)

      if (exerciseIds.length > 0) {
        const { error: seError } = await supabase.from('session_exercises').insert(
          exerciseIds.map((ex, i) => ({
            session_id: id,
            exercise_id: ex.id,
            order_index: i,
            sets_planned: ex.setsPlanned,
            rest_seconds: ex.restSeconds,
            target_reps: ex.targetReps ?? null,
            target_duration_seconds: ex.targetDurationSeconds ?? null,
            target_weight: ex.targetWeight ?? null,
          }))
        )
        if (seError) throw seError
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['session', id] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}
