import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkout } from '@/hooks/useWorkouts'
import { useWorkoutStore, type WorkoutStep } from '@/store/workoutStore'
import CircuitTimer from '@/components/timer/CircuitTimer'
import PageHeader from '@/components/layout/PageHeader'
import { CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const { data: workout } = useWorkout(id)
  const navigate = useNavigate()
  const { isActive, phase, startWorkout, reset } = useWorkoutStore()

  useEffect(() => {
    if (workout && !isActive) {
      const steps = (workout.workout_exercises ?? [])
        .sort((a, b) => a.order_index - b.order_index) as WorkoutStep[]

      startWorkout({
        workoutId: workout.id,
        workoutName: workout.name,
        steps,
        totalRounds: workout.rounds,
      })
    }
  }, [workout])

  const handleFinish = () => {
    reset()
    toast.success('Workout terminé !')
    navigate('/workouts')
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 space-y-6">
        <CheckCircle size={80} className="text-[var(--color-success)]" />
        <h2 className="text-2xl font-black text-center">Workout terminé !</h2>
        <p className="text-[var(--color-text-muted)] text-center">
          Excellent travail 💪
        </p>
        <button
          onClick={handleFinish}
          className="bg-[var(--color-accent)] text-white font-bold px-8 py-4 rounded-xl active-scale"
        >
          Retour aux workouts
        </button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={workout?.name ?? 'Workout'}
        back
        action={
          <button
            onClick={() => {
              reset()
              navigate(-1)
            }}
            className="text-xs text-[var(--color-danger)] font-semibold"
          >
            Arrêter
          </button>
        }
      />
      <CircuitTimer />
    </div>
  )
}
