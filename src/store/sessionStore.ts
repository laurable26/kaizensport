import { create } from 'zustand'
import type { ActiveExerciseState, ActiveSet } from '@/types/app'

interface SessionStore {
  isActive: boolean
  sessionLogId: string | null
  sessionId: string | null
  sessionName: string
  exercises: ActiveExerciseState[]
  currentExerciseIndex: number

  startSession: (params: {
    sessionLogId: string
    sessionId: string
    sessionName: string
    exercises: ActiveExerciseState[]
  }) => void
  logSet: (exerciseIndex: number, set: ActiveSet) => void
  nextExercise: () => void
  previousExercise: () => void
  setExerciseIndex: (index: number) => void
  completeSession: () => void
  reset: () => void
}

const initialState = {
  isActive: false,
  sessionLogId: null,
  sessionId: null,
  sessionName: '',
  exercises: [],
  currentExerciseIndex: 0,
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  startSession: ({ sessionLogId, sessionId, sessionName, exercises }) => {
    set({
      isActive: true,
      sessionLogId,
      sessionId,
      sessionName,
      exercises,
      currentExerciseIndex: 0,
    })
  },

  logSet: (exerciseIndex, newSet) => {
    set((state) => {
      const exercises = [...state.exercises]
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        completedSets: [...exercises[exerciseIndex].completedSets, newSet],
      }
      return { exercises }
    })
  },

  nextExercise: () => {
    const { currentExerciseIndex, exercises } = get()
    if (currentExerciseIndex < exercises.length - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1 })
    }
  },

  previousExercise: () => {
    const { currentExerciseIndex } = get()
    if (currentExerciseIndex > 0) {
      set({ currentExerciseIndex: currentExerciseIndex - 1 })
    }
  },

  setExerciseIndex: (index) => set({ currentExerciseIndex: index }),

  completeSession: () => {
    set({ isActive: false })
  },

  reset: () => set(initialState),
}))
