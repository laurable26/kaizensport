import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Exercise, ExerciseInsert, ExerciseUpdate } from '@/types/database'

export function useExercises(search?: string, muscleGroup?: string, equipment?: string) {
  return useQuery({
    queryKey: ['exercises', search, muscleGroup, equipment],
    queryFn: async () => {
      let query = supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) query = query.ilike('name', `%${search}%`)
      // muscle_group stocke plusieurs valeurs séparées par virgule → ilike pour chaque
      if (muscleGroup) query = query.ilike('muscle_group', `%${muscleGroup}%`)
      if (equipment) query = query.eq('equipment', equipment)

      const { data, error } = await query
      if (error) throw error
      return data as Exercise[]
    },
  })
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Exercise
    },
    enabled: !!id,
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (exercise: Omit<ExerciseInsert, 'user_id'>) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...exercise, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Exercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

export function useUpdateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: ExerciseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Exercise
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['exercises'] })
      qc.invalidateQueries({ queryKey: ['exercise', id] })
    },
  })
}

// Poids max et 1RM estimé pour tous les exercices de l'utilisateur
export function useExerciseMaxWeights() {
  return useQuery({
    queryKey: ['exercise-max-weights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('set_logs')
        .select('exercise_id, weight, reps')
        .not('weight', 'is', null)
        .gt('weight', 0)
      if (error) throw error

      // Calcul du poids max et 1RM estimé (formule Epley: w * (1 + reps/30))
      const stats: Record<string, { maxWeight: number; estimated1RM: number }> = {}
      for (const row of (data ?? [])) {
        const exId = row.exercise_id as string
        const w = Number(row.weight)
        const r = Number(row.reps) || 1
        const orm = Math.round(w * (1 + r / 30))
        if (!stats[exId] || w > stats[exId].maxWeight) {
          stats[exId] = { maxWeight: w, estimated1RM: orm }
        }
        // Garder le meilleur 1RM même si ce n'est pas le poids max brut
        if (orm > (stats[exId]?.estimated1RM ?? 0)) {
          stats[exId].estimated1RM = orm
        }
      }
      return stats
    },
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
