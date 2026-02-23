import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateWorkout } from '@/hooks/useWorkouts'
import { useExercises } from '@/hooks/useExercises'
import PageHeader from '@/components/layout/PageHeader'
import ExercisePicker from '@/components/exercise/ExercisePicker'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Exercise } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  rounds: z.number().min(1).default(1),
})

type FormData = z.infer<typeof schema>

type WorkoutExerciseConfig = {
  exercise: Exercise
  durationSeconds: number | null
  reps: number | null
  restAfterSeconds: number
  isTimeBased: boolean
}

export default function WorkoutFormPage() {
  const navigate = useNavigate()
  const createWorkout = useCreateWorkout()
  const { data: allExercises = [] } = useExercises()
  const [showPicker, setShowPicker] = useState(false)
  const [exercises, setExercises] = useState<WorkoutExerciseConfig[]>([])
  const [pickerSelected, setPickerSelected] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rounds: 1 },
  })

  const togglePicker = (id: string) => {
    setPickerSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const applyPicker = () => {
    const newExercises = pickerSelected
      .filter((id) => !exercises.find((e) => e.exercise.id === id))
      .map((id) => {
        const exercise = allExercises.find((e) => e.id === id)!
        return {
          exercise,
          durationSeconds: 40,
          reps: null,
          restAfterSeconds: 20,
          isTimeBased: true,
        }
      })
    setExercises((prev) => [...prev, ...newExercises])
    setShowPicker(false)
  }

  const updateExercise = (exerciseId: string, update: Partial<WorkoutExerciseConfig>) => {
    setExercises((prev) => prev.map((e) => e.exercise.id === exerciseId ? { ...e, ...update } : e))
  }

  const onSubmit = async (data: FormData) => {
    try {
      await createWorkout.mutateAsync({
        workout: {
          name: data.name,
          description: data.description || null,
          rounds: data.rounds,
        },
        exercises: exercises.map((e) => ({
          exerciseId: e.exercise.id,
          durationSeconds: e.isTimeBased ? e.durationSeconds : null,
          reps: e.isTimeBased ? null : e.reps,
          restAfterSeconds: e.restAfterSeconds,
        })),
      })
      toast.success('Workout créé')
      navigate('/workouts')
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  if (showPicker) {
    return (
      <div className="min-h-dvh flex flex-col">
        <ExercisePicker
          selected={pickerSelected}
          onToggle={togglePicker}
          onClose={applyPicker}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Nouveau workout" back />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-5 pb-28">
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Nom *</label>
          <input
            {...register('name')}
            placeholder="ex: HIIT Full Body"
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
          />
          {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Nombre de tours</label>
          <input
            {...register('rounds', { valueAsNumber: true })}
            type="number"
            min={1}
            max={10}
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] text-center"
          />
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Exercices ({exercises.length})
            </h2>
            <button type="button" onClick={() => setShowPicker(true)} className="flex items-center gap-1 text-[var(--color-accent)] text-sm font-semibold">
              <Plus size={16} />
              Ajouter
            </button>
          </div>

          {exercises.map((ex) => (
            <div key={ex.exercise.id} className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="flex-1 font-semibold">{ex.exercise.name}</p>
                <button type="button" onClick={() => {
                  setExercises((prev) => prev.filter((e) => e.exercise.id !== ex.exercise.id))
                  setPickerSelected((prev) => prev.filter((id) => id !== ex.exercise.id))
                }}>
                  <X size={16} className="text-[var(--color-text-muted)]" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => updateExercise(ex.exercise.id, { isTimeBased: true })}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${ex.isTimeBased ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)]'}`}
                >
                  Durée
                </button>
                <button
                  type="button"
                  onClick={() => updateExercise(ex.exercise.id, { isTimeBased: false })}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${!ex.isTimeBased ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)]'}`}
                >
                  Reps
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    {ex.isTimeBased ? 'Durée (sec)' : 'Répétitions'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={ex.isTimeBased ? (ex.durationSeconds ?? '') : (ex.reps ?? '')}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (ex.isTimeBased) updateExercise(ex.exercise.id, { durationSeconds: v })
                      else updateExercise(ex.exercise.id, { reps: v })
                    }}
                    className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Repos après (sec)</label>
                  <input
                    type="number"
                    min={0}
                    value={ex.restAfterSeconds}
                    onChange={(e) => updateExercise(ex.exercise.id, { restAfterSeconds: Number(e.target.value) })}
                    className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>

      <div className="footer-btn-container">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale disabled:opacity-50 neon transition-all"
        >
          {isSubmitting ? 'Création...' : 'Créer le workout'}
        </button>
      </div>
    </div>
  )
}
