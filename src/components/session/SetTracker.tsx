import { useState } from 'react'
import { Plus, Minus, Check } from 'lucide-react'
import FeelingRater from './FeelingRater'
import type { ActiveSet } from '@/types/app'

interface Props {
  setNumber: number
  previousSet?: { weight: number; reps: number } | null
  restSeconds: number
  repMode?: 'reps' | 'duration'
  targetDurationSeconds?: number
  onComplete: (set: ActiveSet) => void
}

function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  label,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center active-scale"
        >
          <Minus size={18} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
          className="w-20 text-center text-2xl font-bold bg-transparent text-[var(--color-text)] outline-none"
        />
        <button
          onClick={() => onChange(value + step)}
          className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center active-scale"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

export default function SetTracker({ setNumber, previousSet, restSeconds, repMode = 'reps', targetDurationSeconds, onComplete }: Props) {
  const [weight, setWeight] = useState(previousSet?.weight ?? 0)
  const [reps, setReps] = useState(previousSet?.reps ?? 0)
  const [feeling, setFeeling] = useState<number | null>(null)

  const isDuration = repMode === 'duration'

  const handleComplete = () => {
    onComplete({
      setNumber,
      weight,
      reps: isDuration ? (targetDurationSeconds ?? reps) : reps,
      feeling,
      restSeconds,
      completedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-5 space-y-5">
      {previousSet && !isDuration && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Dernier : {previousSet.weight} kg × {previousSet.reps} reps
        </p>
      )}

      {isDuration && targetDurationSeconds && (
        <p className="text-center text-sm font-semibold text-[var(--color-success)]">
          ⏱ {targetDurationSeconds}s — le timer se lancera automatiquement
        </p>
      )}

      <div className="flex justify-around gap-4">
        <Stepper
          value={weight}
          onChange={setWeight}
          step={2.5}
          label="Poids (kg)"
        />
        {!isDuration && (
          <>
            <div className="w-px bg-[var(--color-border)]" />
            <Stepper
              value={reps}
              onChange={setReps}
              step={1}
              label="Répétitions"
            />
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-center text-[var(--color-text-muted)]">Ressenti</p>
        <FeelingRater value={feeling} onChange={setFeeling} />
      </div>

      <button
        onClick={handleComplete}
        className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold py-4 rounded-xl active-scale flex items-center justify-center gap-2 text-base"
      >
        <Check size={20} />
        {isDuration ? 'Lancer le timer' : 'Série terminée'}
      </button>
    </div>
  )
}
