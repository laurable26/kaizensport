import { useState } from 'react'
import { useExercises, useExerciseMaxWeights } from '@/hooks/useExercises'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react'
import { MUSCLE_GROUPS, MUSCLE_GROUP_COLORS, EQUIPMENT_TYPES } from '@/lib/constants'
import PageHeader from '@/components/layout/PageHeader'
import ExercisePhoto from '@/components/exercise/ExercisePhoto'
import type { Exercise } from '@/types/database'

export default function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | undefined>()
  const [equipmentFilter, setEquipmentFilter] = useState<string | undefined>()
  const [showEquipmentFilter, setShowEquipmentFilter] = useState(false)

  const { data: exercises = [], isLoading } = useExercises(search, muscleFilter, equipmentFilter)
  const { data: maxWeights = {} } = useExerciseMaxWeights()
  const navigate = useNavigate()

  const activeFiltersCount = (muscleFilter ? 1 : 0) + (equipmentFilter ? 1 : 0)

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
        {/* Recherche */}
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

        {/* Filtre groupe musculaire — scroll horizontal */}
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

        {/* Filtre matériel — accordéon */}
        <div>
          <button
            onClick={() => setShowEquipmentFilter((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]"
          >
            {showEquipmentFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Matériel
            {equipmentFilter && (
              <span className="bg-[var(--color-accent)] text-white rounded-full px-2 py-0.5 text-[10px]">
                {EQUIPMENT_TYPES.find(e => e.value === equipmentFilter)?.label}
              </span>
            )}
          </button>
          {showEquipmentFilter && (
            <div className="flex gap-2 flex-wrap mt-2">
              <button
                onClick={() => setEquipmentFilter(undefined)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !equipmentFilter ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                }`}
              >
                Tous
              </button>
              {EQUIPMENT_TYPES.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEquipmentFilter(equipmentFilter === e.value ? undefined : e.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    equipmentFilter === e.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Résumé filtres actifs */}
        {activeFiltersCount > 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {exercises.length} exercice{exercises.length !== 1 ? 's' : ''} · {' '}
            <button
              onClick={() => { setMuscleFilter(undefined); setEquipmentFilter(undefined) }}
              className="text-[var(--color-accent)] underline"
            >
              Effacer les filtres
            </button>
          </p>
        )}

        {/* Liste */}
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
            {exercises.map((ex: Exercise) => {
              // Groupes musculaires → tableau de valeurs
              const muscleValues = ex.muscle_group
                ? ex.muscle_group.split(',').map((v) => v.trim()).filter(Boolean)
                : []
              const stats = maxWeights[ex.id]

              return (
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

                    {/* Bulles groupes musculaires séparées */}
                    {muscleValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {muscleValues.map((val) => (
                          <span
                            key={val}
                            className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_GROUP_COLORS[val] ?? 'bg-gray-500/20 text-gray-300'}`}
                          >
                            {MUSCLE_GROUPS.find((g) => g.value === val)?.label ?? val}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Poids max + 1RM estimé */}
                    {stats && (
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Max <span className="font-semibold text-[var(--color-text)]">{stats.maxWeight} kg</span>
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          1RM <span className="font-semibold text-[var(--color-accent)]">~{stats.estimated1RM} kg</span>
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
