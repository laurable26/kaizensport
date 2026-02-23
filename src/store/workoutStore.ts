import { create } from 'zustand'
import type { Exercise, WorkoutExercise } from '@/types/database'

export type WorkoutStep = WorkoutExercise & {
  exercise: Exercise
}

export type WorkoutPhase = 'exercise' | 'rest' | 'complete'

interface WorkoutStore {
  isActive: boolean
  workoutId: string | null
  workoutName: string
  steps: WorkoutStep[]
  currentStepIndex: number
  currentRound: number
  totalRounds: number
  phase: WorkoutPhase
  secondsRemaining: number
  _intervalId: ReturnType<typeof setInterval> | null

  startWorkout: (params: {
    workoutId: string
    workoutName: string
    steps: WorkoutStep[]
    totalRounds: number
  }) => void
  startPhase: (phase: WorkoutPhase, seconds: number) => void
  skipPhase: () => void
  _tick: () => void
  _advanceStep: () => void
  _advanceToNextExercise: () => void
  completeWorkout: () => void
  reset: () => void
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  isActive: false,
  workoutId: null,
  workoutName: '',
  steps: [],
  currentStepIndex: 0,
  currentRound: 1,
  totalRounds: 1,
  phase: 'exercise',
  secondsRemaining: 0,
  _intervalId: null,

  startWorkout: ({ workoutId, workoutName, steps, totalRounds }) => {
    const firstStep = steps[0]
    const duration = firstStep?.duration_seconds ?? 30
    set({
      isActive: true,
      workoutId,
      workoutName,
      steps,
      currentStepIndex: 0,
      currentRound: 1,
      totalRounds,
      phase: 'exercise',
      secondsRemaining: duration,
    })
    get().startPhase('exercise', duration)
  },

  startPhase: (phase, seconds) => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)

    if (navigator.vibrate) navigator.vibrate(100)

    const intervalId = setInterval(() => get()._tick(), 1000)
    set({ phase, secondsRemaining: seconds, _intervalId: intervalId })
  },

  skipPhase: () => {
    get()._advanceStep()
  },

  _tick: () => {
    const { secondsRemaining } = get()
    if (secondsRemaining <= 1) {
      get()._advanceStep()
    } else {
      set({ secondsRemaining: secondsRemaining - 1 })
    }
  },

  _advanceStep: () => {
    const { _intervalId, phase, currentStepIndex, steps } = get()
    if (_intervalId) clearInterval(_intervalId)

    if (phase === 'exercise') {
      const step = steps[currentStepIndex]
      const restSeconds = step?.rest_after_seconds ?? 30
      if (restSeconds > 0) {
        get().startPhase('rest', restSeconds)
      } else {
        // Skip rest, go to next exercise
        get()._advanceToNextExercise()
      }
    } else if (phase === 'rest') {
      get()._advanceToNextExercise()
    }
  },

  _advanceToNextExercise: () => {
    const { currentStepIndex, steps, currentRound, totalRounds } = get()
    const isLastStep = currentStepIndex >= steps.length - 1

    if (isLastStep) {
      if (currentRound < totalRounds) {
        set({ currentStepIndex: 0, currentRound: currentRound + 1 })
        const firstStep = steps[0]
        get().startPhase('exercise', firstStep?.duration_seconds ?? 30)
      } else {
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
        set({ phase: 'complete', isActive: false, secondsRemaining: 0 })
      }
    } else {
      const nextStep = steps[currentStepIndex + 1]
      set({ currentStepIndex: currentStepIndex + 1 })
      get().startPhase('exercise', nextStep?.duration_seconds ?? 30)
    }
  },

  completeWorkout: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({ phase: 'complete', isActive: false })
  },

  reset: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({
      isActive: false,
      workoutId: null,
      workoutName: '',
      steps: [],
      currentStepIndex: 0,
      currentRound: 1,
      totalRounds: 1,
      phase: 'exercise',
      secondsRemaining: 0,
      _intervalId: null,
    })
  },
}))
