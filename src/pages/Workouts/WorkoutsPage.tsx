import { useWorkouts } from '@/hooks/useWorkouts'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { Plus, Zap, Play } from 'lucide-react'
import type { Workout } from '@/types/database'

export default function WorkoutsPage() {
  const { data: workouts = [], isLoading } = useWorkouts()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Workouts"
        action={
          <button
            onClick={() => navigate('/workouts/new')}
            className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center active-scale"
          >
            <Plus size={20} className="text-white" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))
        ) : workouts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Zap size={48} className="mx-auto text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Aucun workout créé</p>
            <button
              onClick={() => navigate('/workouts/new')}
              className="text-[var(--color-accent)] font-semibold text-sm"
            >
              Créer un circuit
            </button>
          </div>
        ) : (
          workouts.map((workout: Workout) => (
            <div
              key={workout.id}
              className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4"
            >
              <button
                onClick={() => navigate(`/workouts/${workout.id}`)}
                className="flex-1 text-left active-scale"
              >
                <p className="font-semibold">{workout.name}</p>
                {workout.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{workout.description}</p>
                )}
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {workout.rounds} tour{workout.rounds > 1 ? 's' : ''}
                </p>
              </button>
              <button
                onClick={() => navigate(`/workouts/${workout.id}/start`)}
                className="w-10 h-10 rounded-xl bg-[var(--color-success)] flex items-center justify-center active-scale flex-shrink-0"
              >
                <Play size={16} className="text-white ml-0.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
