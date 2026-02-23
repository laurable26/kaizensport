import { useWorkoutStore } from '@/store/workoutStore'
import { SkipForward } from 'lucide-react'

export default function CircuitTimer() {
  const { steps, currentStepIndex, phase, secondsRemaining, skipPhase, currentRound, totalRounds } = useWorkoutStore()

  const currentStep = steps[currentStepIndex]
  const nextStep = steps[currentStepIndex + 1]

  const maxSeconds = phase === 'exercise'
    ? (currentStep?.duration_seconds ?? 30)
    : (currentStep?.rest_after_seconds ?? 30)

  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * (1 - secondsRemaining / Math.max(maxSeconds, 1))

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Round indicator */}
      {totalRounds > 1 && (
        <div className="text-sm text-[var(--color-text-muted)]">
          Tour {currentRound} / {totalRounds}
        </div>
      )}

      {/* Phase label */}
      <div className={`text-lg font-bold tracking-wider uppercase ${
        phase === 'rest' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
      }`}>
        {phase === 'rest' ? 'Repos' : 'Exercice'}
      </div>

      {/* Current exercise name */}
      <h2 className="text-2xl font-bold text-center px-4">
        {phase === 'rest' ? 'Préparez-vous...' : (currentStep?.exercise?.name ?? '')}
      </h2>

      {/* Circular timer */}
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={phase === 'rest' ? 'var(--color-warning)' : 'var(--color-success)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold tabular-nums">{secondsRemaining}</span>
        </div>
      </div>

      {/* Next up */}
      {nextStep && phase === 'exercise' && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Suivant : {nextStep.exercise?.name}
        </p>
      )}

      {/* Skip */}
      <button
        onClick={skipPhase}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-surface-2)] active-scale text-[var(--color-text-muted)]"
      >
        <SkipForward size={18} />
        Passer
      </button>
    </div>
  )
}
