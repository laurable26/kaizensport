import { useState } from 'react'
import { Minus, Plus, Check } from 'lucide-react'
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

// Stepper compact : boutons −/+ autour d'un champ clavier numérique
function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  label,
  decimals = 0,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  label: string
  decimals?: number
}) {
  // Texte affiché dans l'input (permet la saisie libre)
  const [raw, setRaw] = useState(value > 0 ? String(value) : '')

  const commit = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    if (!isNaN(n)) onChange(Math.max(min, n))
    else if (s === '' || s === '-') onChange(min)
  }

  const inc = () => {
    const next = parseFloat((value + step).toFixed(decimals || 0))
    onChange(next)
    setRaw(String(next))
  }
  const dec = () => {
    const next = parseFloat(Math.max(min, value - step).toFixed(decimals || 0))
    onChange(next)
    setRaw(String(next))
  }

  // Synchronise raw avec value quand value change via boutons
  const displayed = raw !== '' && parseFloat(raw.replace(',', '.')) === value
    ? raw
    : value > 0 ? String(value) : ''

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium whitespace-nowrap">
        {label}
      </span>
      <div className="flex items-center gap-1.5 w-full justify-center">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={dec}
          className="w-11 h-11 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center active-scale flex-shrink-0 touch-manipulation"
        >
          <Minus size={18} />
        </button>
        <input
          inputMode="decimal"
          type="text"
          pattern="[0-9]*[.,]?[0-9]*"
          value={displayed}
          placeholder="0"
          onChange={(e) => {
            setRaw(e.target.value)
          }}
          onBlur={(e) => commit(e.target.value)}
          className="w-16 text-center text-2xl font-black bg-[var(--color-surface-2)] text-[var(--color-text)] rounded-xl py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)] min-w-0"
        />
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={inc}
          className="w-11 h-11 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center active-scale flex-shrink-0 touch-manipulation"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

export default function SetTracker({
  setNumber,
  previousSet,
  restSeconds,
  repMode = 'reps',
  targetDurationSeconds,
  onComplete,
}: Props) {
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
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-4">
      {previousSet && !isDuration && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Dernière série : <span className="font-semibold">{previousSet.weight} kg × {previousSet.reps}</span>
        </p>
      )}

      {isDuration && targetDurationSeconds && (
        <p className="text-center text-sm font-semibold text-[var(--color-accent)]">
          ⏱ {targetDurationSeconds}s — le timer se lancera automatiquement
        </p>
      )}

      {/* Steppers côte à côte */}
      <div className="flex items-start justify-center gap-2">
        <Stepper
          value={weight}
          onChange={setWeight}
          step={2.5}
          min={0}
          label="Poids (kg)"
          decimals={1}
        />
        {!isDuration && (
          <>
            <div className="w-px bg-[var(--color-border)] self-stretch mt-6" />
            <Stepper
              value={reps}
              onChange={setReps}
              step={1}
              min={0}
              label="Reps"
              decimals={0}
            />
          </>
        )}
      </div>

      {/* Ressenti */}
      <div className="space-y-1.5">
        <p className="text-xs text-center text-[var(--color-text-muted)]">Ressenti</p>
        <FeelingRater value={feeling} onChange={setFeeling} />
      </div>

      <button
        onClick={handleComplete}
        className="w-full bg-[var(--color-accent)] text-white font-bold py-4 rounded-xl active-scale flex items-center justify-center gap-2 text-base neon"
      >
        <Check size={20} />
        {isDuration ? 'Lancer le timer' : 'Série terminée'}
      </button>
    </div>
  )
}
