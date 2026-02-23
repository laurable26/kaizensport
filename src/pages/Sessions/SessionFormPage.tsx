import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateSession, useUpdateSession, useSession, useDeleteSession } from '@/hooks/useSessions'
import { useExercises } from '@/hooks/useExercises'
import PageHeader from '@/components/layout/PageHeader'
import ExercisePicker from '@/components/exercise/ExercisePicker'
import { Plus, X, GripVertical, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Exercise } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type RepMode = 'reps' | 'duration'

type ExerciseSlot = {
  uid: string
  exercise: Exercise
  setsPlanned: number
  restSeconds: number
  repMode: RepMode
  targetReps: number
  targetDuration: number
  targetWeight: number | null
}

let _counter = 0
const newUid = () => `slot-${++_counter}-${Date.now()}`

function makeSlot(exercise: Exercise): ExerciseSlot {
  return {
    uid: newUid(),
    exercise,
    setsPlanned: 3,
    restSeconds: 90,
    repMode: 'reps',
    targetReps: 10,
    targetDuration: 30,
    targetWeight: null,
  }
}

function estimateDuration(slots: ExerciseSlot[]): number {
  if (slots.length === 0) return 0
  const totalSeconds = slots.reduce((acc, s) => {
    const setTime = s.repMode === 'duration' ? s.targetDuration : 45
    return acc + s.setsPlanned * (setTime + s.restSeconds)
  }, 0)
  return Math.round(totalSeconds / 60)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `~${h}h${m.toString().padStart(2, '0')}` : `~${h}h`
}

// ─── Drag & Drop (touch + mouse) ─────────────────────────────────────────────
function useDragSort(
  slots: ExerciseSlot[],
  setSlots: React.Dispatch<React.SetStateAction<ExerciseSlot[]>>
) {
  const draggingUid = useRef<string | null>(null)
  const dragOverUid = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onDragStart = useCallback((uid: string) => {
    draggingUid.current = uid
    setDraggingId(uid)
  }, [])

  const onDragEnter = useCallback((uid: string) => {
    dragOverUid.current = uid
    const idx = slots.findIndex((s) => s.uid === uid)
    setOverIdx(idx)
  }, [slots])

  const onDragEnd = useCallback(() => {
    if (draggingUid.current && dragOverUid.current && draggingUid.current !== dragOverUid.current) {
      setSlots((prev) => {
        const arr = [...prev]
        const fromIdx = arr.findIndex((s) => s.uid === draggingUid.current)
        const toIdx = arr.findIndex((s) => s.uid === dragOverUid.current)
        if (fromIdx === -1 || toIdx === -1) return prev
        const [item] = arr.splice(fromIdx, 1)
        arr.splice(toIdx, 0, item)
        return arr
      })
    }
    draggingUid.current = null
    dragOverUid.current = null
    setDraggingId(null)
    setOverIdx(null)
  }, [setSlots])

  // ── Touch events ──────────────────────────────────────────────────────────
  const touchStartY = useRef(0)

  const onTouchStart = useCallback((uid: string, e: React.TouchEvent) => {
    draggingUid.current = uid
    setDraggingId(uid)
    touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingUid.current) return
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const card = el?.closest('[data-slot-uid]')
    if (card) {
      const uid = card.getAttribute('data-slot-uid')
      if (uid && uid !== draggingUid.current) {
        dragOverUid.current = uid
        const idx = slots.findIndex((s) => s.uid === uid)
        setOverIdx(idx)
      }
    }
  }, [slots])

  const onTouchEnd = useCallback(() => {
    onDragEnd()
  }, [onDragEnd])

  return { draggingId, overIdx, onDragStart, onDragEnter, onDragEnd, onTouchStart, onTouchMove, onTouchEnd }
}

export default function SessionFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const createSession = useCreateSession()
  const updateSession = useUpdateSession()
  const deleteSession = useDeleteSession()
  const { data: existing } = useSession(id)
  const { data: allExercises = [] } = useExercises()
  const [showPicker, setShowPicker] = useState(false)
  const [slots, setSlots] = useState<ExerciseSlot[]>([])
  const [initialized, setInitialized] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const drag = useDragSort(slots, setSlots)

  useEffect(() => {
    if (existing && !initialized) {
      reset({ name: existing.name, notes: existing.notes ?? '' })
      const loaded: ExerciseSlot[] = (existing.session_exercises ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((se) => ({
          uid: newUid(),
          exercise: se.exercise as Exercise,
          setsPlanned: se.sets_planned,
          restSeconds: se.rest_seconds,
          repMode: se.target_duration_seconds != null ? 'duration' : 'reps',
          targetReps: se.target_reps ?? 10,
          targetDuration: se.target_duration_seconds ?? 30,
          targetWeight: se.target_weight ?? null,
        }))
      setSlots(loaded)
      setInitialized(true)
    }
  }, [existing, initialized, reset])

  const handleAddFromPicker = useCallback((selectedIds: string[]) => {
    const newSlots: ExerciseSlot[] = selectedIds.map((eid) => {
      const exercise = allExercises.find((e) => e.id === eid)!
      return makeSlot(exercise)
    })
    setSlots((prev) => [...prev, ...newSlots])
    setShowPicker(false)
  }, [allExercises])

  const removeSlot = (uid: string) => setSlots((prev) => prev.filter((s) => s.uid !== uid))

  const updateSlot = (uid: string, patch: Partial<ExerciseSlot>) =>
    setSlots((prev) => prev.map((s) => s.uid === uid ? { ...s, ...patch } : s))

  const handleDelete = async () => {
    if (!id || !confirm('Supprimer cette séance ?')) return
    try {
      await deleteSession.mutateAsync(id)
      toast.success('Séance supprimée')
      navigate('/sessions', { replace: true })
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const exerciseIds = slots.map((s) => ({
        id: s.exercise.id,
        setsPlanned: s.setsPlanned,
        restSeconds: s.restSeconds,
        targetReps: s.repMode === 'reps' ? s.targetReps : null,
        targetDurationSeconds: s.repMode === 'duration' ? s.targetDuration : null,
        targetWeight: s.targetWeight,
      }))
      if (isEditing && id) {
        await updateSession.mutateAsync({
          id,
          session: { name: data.name, notes: data.notes || null },
          exerciseIds,
        })
        toast.success('Séance mise à jour')
        navigate(`/sessions/${id}`, { replace: true })
      } else {
        await createSession.mutateAsync({
          session: { name: data.name, notes: data.notes || null },
          exerciseIds,
        })
        toast.success('Séance créée')
        navigate('/sessions')
      }
    } catch (err: any) {
      console.error('Session save error:', err)
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err)
      toast.error(`Erreur : ${msg}`)
    }
  }

  const estimatedMin = estimateDuration(slots)

  if (showPicker) {
    return (
      <div className="min-h-dvh flex flex-col">
        <ExercisePicker
          selected={[]}
          onToggle={() => {}}
          onClose={() => setShowPicker(false)}
          onAdd={handleAddFromPicker}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Modifier la séance' : 'Nouvelle séance'}
        back
        action={isEditing ? (
          <button onClick={handleDelete} className="p-2 text-[var(--color-danger)] active-scale">
            <Trash2 size={20} />
          </button>
        ) : undefined}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-5 pb-32">
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Nom de la séance *</label>
          <input
            {...register('name')}
            placeholder="ex: Push A, Jambes..."
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-all"
          />
          {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Objectifs, remarques..."
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        {/* Exercices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                Exercices ({slots.length})
              </h2>
              {estimatedMin > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={11} className="text-[var(--color-text-muted)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">{formatDuration(estimatedMin)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 text-[var(--color-accent)] text-sm font-semibold"
            >
              <Plus size={16} />
              Ajouter
            </button>
          </div>

          {slots.map((slot, idx) => {
            const isDragging = drag.draggingId === slot.uid
            const isOver = drag.overIdx === idx && drag.draggingId !== slot.uid
            const sameExCount = slots.filter((s, i) => s.exercise.id === slot.exercise.id && i <= idx).length
            const hasMultiple = slots.filter((s) => s.exercise.id === slot.exercise.id).length > 1

            return (
              <div
                key={slot.uid}
                data-slot-uid={slot.uid}
                className={`bg-[var(--color-surface)] rounded-2xl p-4 space-y-3 transition-all ${
                  isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                } ${isOver ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]' : ''}`}
                draggable
                onDragStart={() => drag.onDragStart(slot.uid)}
                onDragEnter={() => drag.onDragEnter(slot.uid)}
                onDragEnd={drag.onDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                {/* Header exercice */}
                <div className="flex items-center gap-3">
                  {/* Poignée drag – touch */}
                  <div
                    className="p-1 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={(e) => drag.onTouchStart(slot.uid, e)}
                    onTouchMove={drag.onTouchMove}
                    onTouchEnd={drag.onTouchEnd}
                  >
                    <GripVertical size={18} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{slot.exercise.name}</p>
                    {hasMultiple && (
                      <p className="text-[10px] text-[var(--color-accent)] font-medium">
                        Passage {sameExCount}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => removeSlot(slot.uid)} className="p-1 text-[var(--color-text-muted)]">
                    <X size={16} />
                  </button>
                </div>

                {/* Séries + Repos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--color-text-muted)]">Séries</label>
                    <input
                      type="number"
                      value={slot.setsPlanned}
                      min={1}
                      onChange={(e) => updateSlot(slot.uid, { setsPlanned: Math.max(1, Number(e.target.value)) })}
                      className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--color-text-muted)]">Repos (sec)</label>
                    <input
                      type="number"
                      value={slot.restSeconds}
                      min={0}
                      step={5}
                      onChange={(e) => updateSlot(slot.uid, { restSeconds: Math.max(0, Number(e.target.value)) })}
                      className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)]"
                    />
                  </div>
                </div>

                {/* Toggle reps / durée */}
                <div className="flex gap-1 p-1 bg-[var(--color-surface-2)] rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateSlot(slot.uid, { repMode: 'reps' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      slot.repMode === 'reps'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    Répétitions
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSlot(slot.uid, { repMode: 'duration' })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      slot.repMode === 'duration'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    Durée (sec)
                  </button>
                </div>

                {/* Objectif + Poids */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--color-text-muted)]">
                      {slot.repMode === 'reps' ? 'Reps cibles *' : 'Durée cible (sec) *'}
                    </label>
                    {slot.repMode === 'reps' ? (
                      <input
                        type="number"
                        value={slot.targetReps}
                        min={1}
                        onChange={(e) => updateSlot(slot.uid, { targetReps: Math.max(1, Number(e.target.value)) })}
                        className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)] border border-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
                      />
                    ) : (
                      <input
                        type="number"
                        value={slot.targetDuration}
                        min={1}
                        step={5}
                        onChange={(e) => updateSlot(slot.uid, { targetDuration: Math.max(1, Number(e.target.value)) })}
                        className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)] border border-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--color-text-muted)]">Poids (kg)</label>
                    <input
                      type="number"
                      value={slot.targetWeight ?? ''}
                      min={0}
                      step={0.5}
                      placeholder="—"
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        updateSlot(slot.uid, { targetWeight: val })
                      }}
                      className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {slots.length === 0 && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full border-2 border-dashed border-[var(--color-border)] rounded-2xl p-6 text-[var(--color-text-muted)] text-sm text-center active-scale"
            >
              Appuyer pour ajouter des exercices
            </button>
          )}
        </div>
      </form>

      <div className="footer-btn-container">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale disabled:opacity-50 neon transition-all"
        >
          {isSubmitting
            ? 'Enregistrement...'
            : isEditing ? 'Mettre à jour' : 'Créer la séance'}
        </button>
      </div>
    </div>
  )
}
