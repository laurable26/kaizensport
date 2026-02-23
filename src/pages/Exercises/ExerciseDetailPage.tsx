import { useParams, useNavigate } from 'react-router-dom'
import { useExercise } from '@/hooks/useExercises'
import { MUSCLE_GROUPS, MUSCLE_GROUP_COLORS, EQUIPMENT_TYPES } from '@/lib/constants'
import PageHeader from '@/components/layout/PageHeader'
import ProgressChart from '@/components/charts/ProgressChart'
import { Edit2, ExternalLink } from 'lucide-react'
import ExercisePhoto from '@/components/exercise/ExercisePhoto'

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: exercise, isLoading } = useExercise(id)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div>
        <PageHeader title="..." back />
        <div className="px-4 py-6 space-y-4">
          <div className="h-48 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          <div className="h-8 bg-[var(--color-surface)] rounded-xl animate-pulse" />
          <div className="h-40 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!exercise) return null

  const muscleLabel = MUSCLE_GROUPS.find((g) => g.value === exercise.muscle_group)?.label
  const equipmentLabel = EQUIPMENT_TYPES.find((e) => e.value === exercise.equipment)?.label

  return (
    <div>
      <PageHeader
        title={exercise.name}
        back="/exercises"
        action={
          <button
            onClick={() => navigate(`/exercises/${id}/edit`)}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
          >
            <Edit2 size={16} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-5">
        {/* Photo — format portrait 3:4 */}
        <div className="mx-auto rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', maxWidth: '280px' }}>
          <ExercisePhoto
            photoUrl={exercise.photo_url}
            name={exercise.name}
            className="w-full h-full rounded-2xl"
            iconSize={48}
          />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {muscleLabel && (
            <span className={`text-sm px-3 py-1 rounded-full ${MUSCLE_GROUP_COLORS[exercise.muscle_group!] ?? 'bg-gray-500/20 text-gray-300'}`}>
              {muscleLabel}
            </span>
          )}
          {equipmentLabel && (
            <span className="text-sm px-3 py-1 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
              {equipmentLabel}
            </span>
          )}
        </div>

        {/* Notes */}
        {exercise.notes && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm leading-relaxed text-[var(--color-text)]">{exercise.notes}</p>
          </div>
        )}

        {/* External link */}
        {exercise.external_link && (
          <a
            href={exercise.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[var(--color-surface)] rounded-2xl p-4 active-scale"
          >
            <ExternalLink size={18} className="text-[var(--color-accent)]" />
            <span className="text-sm text-[var(--color-accent)] flex-1 truncate">Voir tutoriel</span>
          </a>
        )}

        {/* Progress chart */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
            Progression
          </h2>
          <ProgressChart exerciseId={exercise.id} />
        </div>
      </div>
    </div>
  )
}
