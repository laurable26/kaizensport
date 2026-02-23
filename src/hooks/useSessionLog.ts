import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SetLogInsert } from '@/types/database'

export function useSessionLogs() {
  return useQuery({
    queryKey: ['session-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_logs')
        .select(`
          *,
          sessions(name)
        `)
        .order('started_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

export function useSessionLogDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['session-log', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('session_logs')
        .select(`
          *,
          sessions(name),
          set_logs(
            *,
            exercise:exercises(name, muscle_group)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useStartSessionLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('session_logs')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-logs'] }),
  })
}

export function useLogSet() {
  return useMutation({
    mutationFn: async (set: SetLogInsert) => {
      const { data, error } = await supabase
        .from('set_logs')
        .insert(set)
        .select()
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCompleteSessionLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionLogId,
      overallFeeling,
      notes,
    }: {
      sessionLogId: string
      overallFeeling?: number
      notes?: string
    }) => {
      const { error } = await supabase
        .from('session_logs')
        .update({
          completed_at: new Date().toISOString(),
          overall_feeling: overallFeeling,
          notes,
        })
        .eq('id', sessionLogId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-logs'] })
    },
  })
}
