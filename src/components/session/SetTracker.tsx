import { useState, useEffect } from 'react'
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

function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  label,
  allowDecimal = false,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  label: string
  allowDecimal?: boolean
}) {
  // raw = ce que l'utilisateur tape (string libre)
  const [raw, setRaw] = useState(() => (value > 0 ? String(value) : ''))
  const [focused, setFocused] = useState(false)

  // Quand value change via bouton +/-, mettre à jour raw (sauf si l'user tape)
  useEffect(() => {
    if (!focused) {
      setRaw(value > 0 ? String(value) : '')
    }
  }, [value, focused])

  const parse = (s: string): number => {
    const n = parseFloat(s.replace(',', '.'))
    return isNaN(n) ? min : Math.max(min, n)
  }

  const inc = () => {
    const next = parseFloat((value + step).toFixed(allowDecimal ? 2 : 0))
    onChange(next)
  }

  const dec = () => {
    const next = parseFloat(Math.max(min, value - step).toFixed(allowDecimal ? 2 : 0))
    onChange(next)
  }

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium">
        {label}
      </span>
      <div className="flex items-center gap-2 w-full justify-center">
        {/* Bouton moins */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()} // évite de flouter l'input
          onClick={dec}
          className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center active-scale flex-shrink-0 touch-manipulation text-lg font-bold"
        >
          <Minus size={20} />
        </button>

        {/* Champ numérique */}
        <input
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          type="text"
          value={focused ? raw : (value > 0 ? String(value) : '')}
          placeholder="0"
          onChange={(e) => {
            // N'autoriser que chiffres, virgule, point
            const filtered = allowDecimal
              ? e.target.value.replace(/[^0-9.,]/g, '')
              : e.target.value.replace(/[^0-9]/g, '')
            setRaw(filtered)
          }}
          onFocus={() => {
            setFocused(true)
            setRaw(value > 0 ? String(value) : '')
          }}
          onBlur={(e) => {
            setFocused(false)
            onChange(parse(e.target.value))
          }}
          className="w-16 text-center text-3xl font-black bg-[var(--color-surface-2)] text-[var(--color-text)] rounded-xl py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)] touch-manipulation"
        />

        {/* Bouton plus */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={inc}
          className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center active-scale flex-shrink-0 touch-manipulation text-lg font-bold"
        >
          <Plus size={20} />
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
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-5">
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

      {/* Poids + Reps */}
      <div className="flex items-start gap-3">
        <Stepper
          value={weight}
          onChange={setWeight}
          step={2.5}
          min={0}
          label="Poids (kg)"
          allowDecimal
        />
        {!isDuration && (
          <>
            <div className="w-px bg-[var(--color-border)] self-stretch mt-7" />
            <Stepper
              value={reps}
              onChange={setReps}
              step={1}
              min={0}
              label="Reps"
              allowDecimal={false}
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
