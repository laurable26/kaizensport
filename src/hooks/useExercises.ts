import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Exercise, ExerciseInsert, ExerciseUpdate } from '@/types/database'

export function useExercises(search?: string, muscleGroup?: string) {
  return useQuery({
    queryKey: ['exercises', search, muscleGroup],
    queryFn: async () => {
      let query = supabase
        .from('exercises')
        .select('*')
        .order('name')

      if (search) query = query.ilike('name', `%${search}%`)
      if (muscleGroup) query = query.eq('muscle_group', muscleGroup)

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
      const { data: { user } } = await supabase.auth.getUser()
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
