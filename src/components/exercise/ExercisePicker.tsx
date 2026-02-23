import { useState } from 'react'
import { Search, X, Check, Plus } from 'lucide-react'
import { useExercises } from '@/hooks/useExercises'
import { MUSCLE_GROUPS, MUSCLE_GROUP_COLORS } from '@/lib/constants'
import ExercisePhoto from './ExercisePhoto'
import type { Exercise } from '@/types/database'

interface Props {
  selected: string[]
  onToggle: (exerciseId: string) => void
  onClose: () => void
  /** Mode "ajout multiple" : chaque tap ajoute directement l'exercice */
  onAdd?: (exerciseIds: string[]) => void
}

export default function ExercisePicker({ selected, onToggle, onClose, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | undefined>()
  const [localSelected, setLocalSelected] = useState<string[]>([])
  const { data: exercises = [] } = useExercises(search, muscleFilter)

  // Mode "onAdd" : sélection locale, puis on confirme tout d'un coup
  const isAddMode = !!onAdd

  const handleToggle = (ex: Exercise) => {
    if (isAddMode) {
      setLocalSelected((prev) =>
        prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]
      )
    } else {
      onToggle(ex.id)
    }
  }

  const handleConfirm = () => {
    if (isAddMode && onAdd) {
      onAdd(localSelected)
    } else {
      onClose()
    }
  }

  const currentSelected = isAddMode ? localSelected : selected
  const confirmLabel = isAddMode
    ? localSelected.length === 0
      ? 'Fermer'
      : `Ajouter ${localSelected.length} exercice${localSelected.length > 1 ? 's' : ''}`
    : `Confirmer (${selected.length} sélectionné${selected.length !== 1 ? 's' : ''})`

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
        <h2 className="flex-1 text-lg font-bold">Sélectionner des exercices</h2>
        <button onClick={onClose} className="p-2 active-scale">
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface)] pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Muscle group filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMuscleFilter(undefined)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
              !muscleFilter ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
            }`}
          >
            Tous
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g.value}
              onClick={() => setMuscleFilter(muscleFilter === g.value ? undefined : g.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                muscleFilter === g.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
        {exercises.map((ex: Exercise) => {
          const isSelected = currentSelected.includes(ex.id)
          return (
            <button
              key={ex.id}
              onClick={() => handleToggle(ex)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active-scale hover:bg-[var(--color-surface)]"
            >
              {isAddMode ? (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'
                }`}>
                  {isSelected
                    ? <Check size={14} className="text-white" />
                    : <Plus size={14} className="text-[var(--color-text-muted)]" />
                  }
                </div>
              ) : (
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border)]'
                }`}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              )}

              {/* Miniature photo */}
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <ExercisePhoto photoUrl={ex.photo_url} name={ex.name} className="w-10 h-10 rounded-lg" iconSize={16} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-[var(--color-text)]">{ex.name}</p>
                {ex.muscle_group && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_GROUP_COLORS[ex.muscle_group] ?? 'bg-gray-500/20 text-gray-300'}`}>
                    {MUSCLE_GROUPS.find((g) => g.value === ex.muscle_group)?.label ?? ex.muscle_group}
                  </span>
                )}
              </div>
            </button>
          )
        })}

        {exercises.length === 0 && (
          <div className="p-8 text-center text-[var(--color-text-muted)] text-sm">
            Aucun exercice trouvé
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        <button
          onClick={handleConfirm}
          className="w-full bg-[var(--color-accent)] text-white font-semibold py-3.5 rounded-xl active-scale neon"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
