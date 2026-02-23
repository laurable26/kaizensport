import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Workout, WorkoutInsert } from '@/types/database'
import type { WorkoutWithExercises } from '@/types/app'

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Workout[]
    },
  })
}

export function useWorkout(id: string | undefined) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', id)
        .order('order_index', { referencedTable: 'workout_exercises' })
        .single()
      if (error) throw error
      return data as WorkoutWithExercises
    },
    enabled: !!id,
  })
}

export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      workout,
      exercises,
    }: {
      workout: Omit<WorkoutInsert, 'user_id'>
      exercises: {
        exerciseId: string
        durationSeconds: number | null
        reps: number | null
        restAfterSeconds: number
      }[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newWorkout, error } = await supabase
        .from('workouts')
        .insert({ ...workout, user_id: user.id })
        .select()
        .single()
      if (error) throw error

      if (exercises.length > 0) {
        const { error: weError } = await supabase.from('workout_exercises').insert(
          exercises.map((ex, i) => ({
            workout_id: newWorkout.id,
            exercise_id: ex.exerciseId,
            order_index: i,
            duration_seconds: ex.durationSeconds,
            reps: ex.reps,
            rest_after_seconds: ex.restAfterSeconds,
          }))
        )
        if (weError) throw weError
      }

      return newWorkout as Workout
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}
