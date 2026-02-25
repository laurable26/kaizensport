import { create } from 'zustand'
import type { ActiveBlock } from '@/types/app'

// ── Types ──────────────────────────────────────────────────────────────────

export type SessionPhase =
  | 'exercise'           // saisie de l'exercice courant
  | 'rest_after_exercise' // repos entre exercices d'un même round
  | 'rest_after_round'   // repos entre rounds d'un même bloc
  | 'done'              // tous les blocs + rounds terminés

interface SessionStore {
  isActive: boolean
  sessionLogId: string | null
  sessionId: string | null
  sessionName: string

  blocks: ActiveBlock[]
  currentBlockIndex: number
  currentRound: number         // 1-based
  currentExerciseIndex: number // index dans block.exercises

  phase: SessionPhase

  startSession: (params: {
    sessionLogId: string
    sessionId: string
    sessionName: string
    blocks: ActiveBlock[]
  }) => void

  /**
   * Enregistre le résultat d'un exercice dans les logs en mémoire.
   * Puis appelle advance() pour passer à l'état suivant.
   */
  logExercise: (
    blockIdx: number,
    round: number,
    exIdx: number,
    result: { reps: number; weight: number; feeling: number | null }
  ) => void

  /**
   * Avance au prochain état (exercice / round / bloc / fin).
   * Retourne l'objet décrivant quel repos déclencher, si besoin.
   */
  advance: () => { phase: SessionPhase; restSeconds: number }

  completeSession: () => void
  reset: () => void
}

// ── État initial ──────────────────────────────────────────────────────────

const initialState = {
  isActive: false,
  sessionLogId: null as string | null,
  sessionId: null as string | null,
  sessionName: '',
  blocks: [] as ActiveBlock[],
  currentBlockIndex: 0,
  currentRound: 1,
  currentExerciseIndex: 0,
  phase: 'exercise' as SessionPhase,
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  startSession: ({ sessionLogId, sessionId, sessionName, blocks }) => {
    set({
      isActive: true,
      sessionLogId,
      sessionId,
      sessionName,
      blocks,
      currentBlockIndex: 0,
      currentRound: 1,
      currentExerciseIndex: 0,
      phase: 'exercise',
    })
  },

  logExercise: (blockIdx, round, exIdx, result) => {
    set((state) => {
      const blocks = state.blocks.map((b, bi) => {
        if (bi !== blockIdx) return b
        return {
          ...b,
          exercises: b.exercises.map((ex, ei) => {
            if (ei !== exIdx) return ex
            return {
              ...ex,
              logs: { ...ex.logs, [round]: result },
            }
          }),
        }
      })
      return { blocks }
    })
  },

  advance: () => {
    const {
      blocks,
      currentBlockIndex: blockIdx,
      currentRound: round,
      currentExerciseIndex: exIdx,
    } = get()

    const block = blocks[blockIdx]
    if (!block) {
      set({ phase: 'done' })
      return { phase: 'done', restSeconds: 0 }
    }

    const isLastExercise = exIdx + 1 >= block.exercises.length
    const isLastRound = round >= block.rounds
    const isLastBlock = blockIdx + 1 >= blocks.length
    const currentEx = block.exercises[exIdx]
    const restAfterEx = currentEx?.restAfterS ?? 0

    if (!isLastExercise) {
      // Passer à l'exercice suivant dans le round
      const nextPhase: SessionPhase = restAfterEx > 0 ? 'rest_after_exercise' : 'exercise'
      set({ currentExerciseIndex: exIdx + 1, phase: 'exercise' })
      return { phase: nextPhase, restSeconds: restAfterEx }
    }

    if (!isLastRound) {
      // Terminer le round, passer au suivant
      const rest = block.restBetweenRoundsS
      set({ currentRound: round + 1, currentExerciseIndex: 0, phase: 'exercise' })
      return { phase: 'rest_after_round', restSeconds: rest }
    }

    if (!isLastBlock) {
      // Terminer le bloc, passer au suivant
      set({ currentBlockIndex: blockIdx + 1, currentRound: 1, currentExerciseIndex: 0, phase: 'exercise' })
      return { phase: 'exercise', restSeconds: 0 }
    }

    // Tout est terminé
    set({ phase: 'done' })
    return { phase: 'done', restSeconds: 0 }
  },

  completeSession: () => {
    set({ isActive: false })
  },

  reset: () => set(initialState),
}))
