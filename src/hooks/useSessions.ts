import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Session, SessionInsert } from '@/types/database'
import type { ActiveBlock, ActiveBlockExercise } from '@/types/app'
import type { Exercise } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────

export type SessionBlockExerciseRow = {
  id: string
  block_id: string
  exercise_id: string
  order_index: number
  rep_mode: 'reps' | 'duration'
  target_reps: number | null
  target_duration_s: number | null
  target_weight: number | null
  rest_after_s: number
  exercise: Exercise
}

export type SessionBlockRow = {
  id: string
  session_id: string
  block_index: number
  label: string | null
  rounds: number
  rest_between_rounds_s: number
  session_block_exercises: SessionBlockExerciseRow[]
}

export type SessionWithBlocks = Session & {
  session_blocks: SessionBlockRow[]
}

/** Pour la liste des séances (SessionsPage) */
export type SessionWithMeta = Session & {
  session_blocks: {
    rounds: number
    rest_between_rounds_s: number
    session_block_exercises: { id: string; target_duration_s: number | null; rest_after_s: number }[]
  }[]
}

/** Compte le total d'exercices dans tous les blocs */
export function countBlockExercises(
  blocks: { session_block_exercises: { id: string }[] | { id: string; target_duration_s: number | null; rest_after_s: number }[] }[]
): number {
  return blocks.reduce((acc, b) => acc + (b.session_block_exercises ?? []).length, 0)
}

/** Estime la durée d'une séance en minutes depuis les blocs */
export function estimateSessionDuration(
  blocks: {
    rounds: number
    rest_between_rounds_s: number
    session_block_exercises: {
      target_duration_s?: number | null
      rest_after_s?: number
    }[]
  }[]
): number {
  const totalSeconds = blocks.reduce((accBlock, b) => {
    const roundDuration = b.session_block_exercises.reduce((accEx, ex) => {
      const exTime = ex.target_duration_s ?? 45
      return accEx + exTime + (ex.rest_after_s ?? 0)
    }, 0)
    return accBlock + b.rounds * (roundDuration + b.rest_between_rounds_s)
  }, 0)
  return Math.round(totalSeconds / 60)
}

// ── Payload types ─────────────────────────────────────────────────────────

export type BlockExercisePayload = {
  exerciseId: string
  repMode: 'reps' | 'duration'
  targetReps?: number | null
  targetDurationS?: number | null
  targetWeight?: number | null
  restAfterS?: number
}

export type BlockPayload = {
  label?: string | null
  rounds: number
  restBetweenRoundsS: number
  exercises: BlockExercisePayload[]
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          session_blocks(
            rounds,
            rest_between_rounds_s,
            session_block_exercises(id, target_duration_s, rest_after_s)
          )
        `)
        .is('archived_at', null)
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
          session_blocks(
            *,
            session_block_exercises(
              *,
              exercise:exercises(*)
            )
          )
        `)
        .eq('id', id)
        .order('block_index', { referencedTable: 'session_blocks' })
        .single()
      if (error) throw error
      const result = data as SessionWithBlocks
      // Garantir le tri (certaines versions de PostgREST ignorent les nested ORDER)
      result.session_blocks = (result.session_blocks ?? [])
        .sort((a, b) => a.block_index - b.block_index)
        .map((b) => ({
          ...b,
          session_block_exercises: (b.session_block_exercises ?? [])
            .sort((a, b) => a.order_index - b.order_index),
        }))
      return result
    },
    enabled: !!id,
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

async function upsertBlocks(sessionId: string, blocks: BlockPayload[]) {
  // Supprimer les anciens blocs (ON DELETE CASCADE supprime les exercises)
  const { error: delErr } = await supabase
    .from('session_blocks')
    .delete()
    .eq('session_id', sessionId)
  if (delErr) throw delErr

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const { data: newBlock, error: blockErr } = await supabase
      .from('session_blocks')
      .insert({
        session_id: sessionId,
        block_index: i,
        label: b.label ?? null,
        rounds: b.rounds,
        rest_between_rounds_s: b.restBetweenRoundsS,
      })
      .select('id')
      .single()
    if (blockErr) throw blockErr

    if (b.exercises.length > 0) {
      const { error: exErr } = await supabase
        .from('session_block_exercises')
        .insert(
          b.exercises.map((ex, j) => ({
            block_id: newBlock.id,
            exercise_id: ex.exerciseId,
            order_index: j,
            rep_mode: ex.repMode,
            target_reps: ex.targetReps ?? null,
            target_duration_s: ex.targetDurationS ?? null,
            target_weight: ex.targetWeight ?? null,
            rest_after_s: ex.restAfterS ?? 0,
          }))
        )
      if (exErr) throw exErr
    }
  }
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      session,
      blocks,
    }: {
      session: Omit<SessionInsert, 'user_id'>
      blocks: BlockPayload[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({ ...session, user_id: user.id })
        .select()
        .single()
      if (error) throw error

      await upsertBlocks(newSession.id, blocks)
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
      blocks,
    }: {
      id: string
      session: { name: string; notes?: string | null }
      blocks: BlockPayload[]
    }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ name: session.name, notes: session.notes ?? null })
        .eq('id', id)
      if (error) throw error

      await upsertBlocks(id, blocks)
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

export function useArchiveSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

// ── Helper : convertit SessionWithBlocks → ActiveBlock[] ──────────────────

export function sessionToActiveBlocks(session: SessionWithBlocks): ActiveBlock[] {
  return (session.session_blocks ?? []).map((b): ActiveBlock => ({
    blockId: b.id,
    label: b.label,
    rounds: b.rounds,
    restBetweenRoundsS: b.rest_between_rounds_s,
    exercises: (b.session_block_exercises ?? []).map((ex): ActiveBlockExercise => ({
      id: ex.id,
      exerciseId: ex.exercise_id,
      exercise: ex.exercise,
      repMode: ex.rep_mode,
      targetReps: ex.target_reps,
      targetDurationS: ex.target_duration_s,
      targetWeight: ex.target_weight,
      restAfterS: ex.rest_after_s,
      logs: {},
    })),
  }))
}
