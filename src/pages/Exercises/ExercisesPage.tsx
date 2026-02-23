import { useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Dumbbell } from 'lucide-react'
import { MUSCLE_GROUPS, MUSCLE_GROUP_COLORS } from '@/lib/constants'
import PageHeader from '@/components/layout/PageHeader'
import ExercisePhoto from '@/components/exercise/ExercisePhoto'
import type { Exercise } from '@/types/database'

export default function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | undefined>()
  const { data: exercises = [], isLoading } = useExercises(search, muscleFilter)
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Exercices"
        action={
          <button
            onClick={() => navigate('/exercises/new')}
            className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center active-scale"
          >
            <Plus size={20} className="text-white" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface)] pl-9 pr-4 py-3 rounded-xl text-sm outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Muscle group filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMuscleFilter(undefined)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !muscleFilter ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
            }`}
          >
            Tous
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g.value}
              onClick={() => setMuscleFilter(muscleFilter === g.value ? undefined : g.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                muscleFilter === g.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Dumbbell size={48} className="mx-auto text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Aucun exercice trouvé</p>
            <button
              onClick={() => navigate('/exercises/new')}
              className="text-[var(--color-accent)] font-semibold text-sm"
            >
              Créer votre premier exercice
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex: Exercise) => (
              <button
                key={ex.id}
                onClick={() => navigate(`/exercises/${ex.id}`)}
                className="w-full bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4 text-left active-scale"
              >
                {/* Photo */}
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden">
                  <ExercisePhoto
                    photoUrl={ex.photo_url}
                    name={ex.name}
                    className="w-14 h-14 rounded-xl"
                    iconSize={22}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {ex.muscle_group && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_GROUP_COLORS[ex.muscle_group] ?? 'bg-gray-500/20 text-gray-300'}`}>
                        {MUSCLE_GROUPS.find((g) => g.value === ex.muscle_group)?.label ?? ex.muscle_group}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
