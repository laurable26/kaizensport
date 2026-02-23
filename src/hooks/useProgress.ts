import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProgressDataPoint } from '@/types/app'
import { subMonths } from 'date-fns'

type TimeRange = '1M' | '3M' | '6M' | 'all'

export function useProgress(exerciseId: string | undefined, range: TimeRange = '3M') {
  return useQuery({
    queryKey: ['progress', exerciseId, range],
    queryFn: async () => {
      if (!exerciseId) return []

      let query = supabase
        .from('set_logs')
        .select(`
          *,
          session_logs!inner(started_at, user_id)
        `)
        .eq('exercise_id', exerciseId)
        .order('logged_at', { ascending: true })

      if (range !== 'all') {
        const months = range === '1M' ? 1 : range === '3M' ? 3 : 6
        const since = subMonths(new Date(), months).toISOString()
        query = query.gte('logged_at', since)
      }

      const { data, error } = await query
      if (error) throw error

      // Group by date and compute stats
      const byDate = new Map<string, { weights: number[]; volumes: number[]; sets: number }>()

      for (const set of data) {
        const date = (set.logged_at as string).slice(0, 10)
        const weight = (set.weight as number) ?? 0
        const reps = (set.reps as number) ?? 0
        const volume = weight * reps

        if (!byDate.has(date)) {
          byDate.set(date, { weights: [], volumes: [], sets: 0 })
        }
        const day = byDate.get(date)!
        day.weights.push(weight)
        day.volumes.push(volume)
        day.sets++
      }

      const result: ProgressDataPoint[] = Array.from(byDate.entries()).map(([date, day]) => {
        const maxWeight = Math.max(...day.weights)
        const totalVolume = day.volumes.reduce((a, b) => a + b, 0)
        const estimatedOneRepMax = maxWeight > 0
          ? Math.round(maxWeight / (1.0278 - 0.0278 * Math.max(1, Math.round(totalVolume / maxWeight))))
          : 0

        return { date, maxWeight, totalVolume, estimatedOneRepMax, sets: day.sets }
      })

      return result
    },
    enabled: !!exerciseId,
  })
}
