import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCreateSession,
  useUpdateSession,
  useSession,
  useDeleteSession,
  estimateSessionDuration,
  type BlockPayload,
} from '@/hooks/useSessions'
import { useExercises } from '@/hooks/useExercises'
import PageHeader from '@/components/layout/PageHeader'
import ExercisePicker from '@/components/exercise/ExercisePicker'
import { Plus, X, Trash2, Clock, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Exercise } from '@/types/database'

// ── Schéma nom/notes ──────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Types locaux ───────────────────────────────────────────────────────────

type RepMode = 'reps' | 'duration'

type ExerciseForm = {
  uid: string
  exercise: Exercise
  repMode: RepMode
  targetReps: number
  targetDurationS: number
  targetWeight: number | null
  restAfterS: number
}

type BlockForm = {
  uid: string
  label: string
  rounds: number
  restBetweenRoundsS: number
  exercises: ExerciseForm[]
  collapsed: boolean
}

let _counter = 0
const newUid = () => `uid-${++_counter}-${Date.now()}`

function makeExercise(exercise: Exercise): ExerciseForm {
  return {
    uid: newUid(),
    exercise,
    repMode: 'reps',
    targetReps: 10,
    targetDurationS: 30,
    targetWeight: null,
    restAfterS: 0,
  }
}

function makeBlock(exercises: Exercise[] = []): BlockForm {
  return {
    uid: newUid(),
    label: '',
    rounds: 3,
    restBetweenRoundsS: 90,
    exercises: exercises.map(makeExercise),
    collapsed: false,
  }
}

// ── Durée estimée (pour affichage) ────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `~${h}h${m.toString().padStart(2, '0')}` : `~${h}h`
}

// ── rawValues helpers ─────────────────────────────────────────────────────
// Permet d'effacer complètement un input numérique pendant la saisie

type RawMap = Record<string, Record<string, string>>

function useRawValues() {
  const [raw, setRaw] = useState<RawMap>({})

  const get = useCallback((uid: string, field: string, numVal: number | null | undefined): string => {
    if (raw[uid]?.[field] !== undefined) return raw[uid][field]
    return numVal == null ? '' : String(numVal)
  }, [raw])

  const put = useCallback((uid: string, field: string, val: string) =>
    setRaw((p) => ({ ...p, [uid]: { ...(p[uid] ?? {}), [field]: val } })), [])

  const clear = useCallback((uid: string, field: string) =>
    setRaw((p) => {
      if (!p[uid]) return p
      const n = { ...p, [uid]: { ...p[uid] } }
      delete n[uid][field]
      return n
    }), [])

  return { get, put, clear }
}

// ── Composant principal ───────────────────────────────────────────────────

export default function SessionFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const navigate = useNavigate()

  const createSession = useCreateSession()
  const updateSession = useUpdateSession()
  const deleteSession = useDeleteSession()
  const { data: existing } = useSession(id)
  const { data: allExercises = [] } = useExercises()

  const [blocks, setBlocks] = useState<BlockForm[]>([])
  const [initialized, setInitialized] = useState(false)

  // UID du bloc ciblé pour l'ExercisePicker
  const [pickerBlockUid, setPickerBlockUid] = useState<string | null>(null)

  const rv = useRawValues()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Charger les données existantes
  useEffect(() => {
    if (existing && !initialized) {
      reset({ name: existing.name, notes: existing.notes ?? '' })
      const loaded: BlockForm[] = (existing.session_blocks ?? [])
        .sort((a, b) => a.block_index - b.block_index)
        .map((sb) => ({
          uid: newUid(),
          label: sb.label ?? '',
          rounds: sb.rounds,
          restBetweenRoundsS: sb.rest_between_rounds_s,
          collapsed: false,
          exercises: (sb.session_block_exercises ?? [])
            .sort((a, b) => a.order_index - b.order_index)
            .map((ex) => ({
              uid: newUid(),
              exercise: ex.exercise as Exercise,
              repMode: ex.rep_mode,
              targetReps: ex.target_reps ?? 10,
              targetDurationS: ex.target_duration_s ?? 30,
              targetWeight: ex.target_weight ?? null,
              restAfterS: ex.rest_after_s,
            })),
        }))
      setBlocks(loaded)
      setInitialized(true)
    }
  }, [existing, initialized, reset])

  // ── Helpers blocs ──────────────────────────────────────────────────────

  const addBlock = () => setBlocks((p) => [...p, makeBlock()])
  const removeBlock = (buid: string) => setBlocks((p) => p.filter((b) => b.uid !== buid))
  const updateBlock = (buid: string, patch: Partial<BlockForm>) =>
    setBlocks((p) => p.map((b) => b.uid === buid ? { ...b, ...patch } : b))
  const toggleCollapse = (buid: string) =>
    setBlocks((p) => p.map((b) => b.uid === buid ? { ...b, collapsed: !b.collapsed } : b))

  // ── Helpers exercices ──────────────────────────────────────────────────

  const addExercisesToBlock = useCallback((buid: string, exerciseIds: string[]) => {
    const newExs = exerciseIds.map((eid) => {
      const exercise = allExercises.find((e) => e.id === eid)!
      return makeExercise(exercise)
    })
    setBlocks((p) => p.map((b) =>
      b.uid === buid ? { ...b, exercises: [...b.exercises, ...newExs] } : b
    ))
    setPickerBlockUid(null)
  }, [allExercises])

  const removeExercise = (buid: string, exuid: string) =>
    setBlocks((p) => p.map((b) =>
      b.uid === buid
        ? { ...b, exercises: b.exercises.filter((ex) => ex.uid !== exuid) }
        : b
    ))

  const updateExercise = (buid: string, exuid: string, patch: Partial<ExerciseForm>) =>
    setBlocks((p) => p.map((b) =>
      b.uid === buid
        ? { ...b, exercises: b.exercises.map((ex) => ex.uid === exuid ? { ...ex, ...patch } : ex) }
        : b
    ))

  const reorderExercisesInBlock = (blockUid: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    setBlocks((prev) => prev.map((b) => {
      if (b.uid !== blockUid) return b
      const exs = [...b.exercises]
      const [moved] = exs.splice(fromIdx, 1)
      exs.splice(toIdx, 0, moved)
      return { ...b, exercises: exs }
    }))
  }

  // Ref pour l'état du drag (HTML5 drag-and-drop)
  const dragRef = useRef<{ blockUid: string; fromIdx: number } | null>(null)

  // ── Durée totale estimée ───────────────────────────────────────────────

  const estimatedMin = estimateSessionDuration(
    blocks.map((b) => ({
      rounds: b.rounds,
      rest_between_rounds_s: b.restBetweenRoundsS,
      session_block_exercises: b.exercises.map((ex) => ({
        target_duration_s: ex.repMode === 'duration' ? ex.targetDurationS : null,
        rest_after_s: ex.restAfterS,
      })),
    }))
  )

  // ── Suppression séance ─────────────────────────────────────────────────

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

  // ── Sauvegarde ────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    try {
      const blockPayloads: BlockPayload[] = blocks.map((b) => ({
        label: b.label || null,
        rounds: b.rounds,
        restBetweenRoundsS: b.restBetweenRoundsS,
        exercises: b.exercises.map((ex) => ({
          exerciseId: ex.exercise.id,
          repMode: ex.repMode,
          targetReps: ex.repMode === 'reps' ? ex.targetReps : null,
          targetDurationS: ex.repMode === 'duration' ? ex.targetDurationS : null,
          targetWeight: ex.targetWeight,
          restAfterS: ex.restAfterS,
        })),
      }))

      if (isEditing && id) {
        await updateSession.mutateAsync({
          id,
          session: { name: data.name, notes: data.notes || null },
          blocks: blockPayloads,
        })
        toast.success('Séance mise à jour')
        navigate(`/sessions/${id}`, { replace: true })
      } else {
        await createSession.mutateAsync({
          session: { name: data.name, notes: data.notes || null },
          blocks: blockPayloads,
        })
        toast.success('Séance créée')
        navigate('/sessions')
      }
    } catch (err: any) {
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err)
      toast.error(`Erreur : ${msg}`)
    }
  }

  // ── ExercisePicker ────────────────────────────────────────────────────

  if (pickerBlockUid) {
    return (
      <div className="min-h-dvh flex flex-col">
        <ExercisePicker
          selected={[]}
          onToggle={() => {}}
          onClose={() => setPickerBlockUid(null)}
          onAdd={(ids) => addExercisesToBlock(pickerBlockUid, ids)}
        />
      </div>
    )
  }

  // ── Rendu ─────────────────────────────────────────────────────────────

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

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-5">
        {/* Nom */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Nom de la séance *</label>
          <input
            {...register('name')}
            placeholder="ex: Push A, Jambes..."
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-all"
          />
          {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-sm text-[var(--color-text-muted)]">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Objectifs, remarques..."
            className="w-full bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        {/* Header blocs */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Blocs ({blocks.length})
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
            onClick={addBlock}
            className="flex items-center gap-1 text-[var(--color-accent)] text-sm font-semibold"
          >
            <Plus size={16} />
            Ajouter un bloc
          </button>
        </div>

        {/* Liste des blocs */}
        {blocks.map((block, blockIdx) => (
          <div
            key={block.uid}
            className="bg-[var(--color-surface)] rounded-2xl overflow-hidden"
          >
            {/* En-tête du bloc */}
            <div className="px-4 pt-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={block.label}
                  onChange={(e) => updateBlock(block.uid, { label: e.target.value })}
                  placeholder={`Bloc ${blockIdx + 1}`}
                  className="flex-1 bg-[var(--color-surface-2)] px-3 py-2 rounded-xl text-sm font-semibold text-[var(--color-text)] outline-none border border-transparent focus:border-[var(--color-accent)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleCollapse(block.uid)}
                  className="p-2 text-[var(--color-text-muted)] active-scale"
                >
                  {block.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.uid)}
                  className="p-2 text-[var(--color-text-muted)] active-scale"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Séries + Repos entre séries */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Séries</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rv.get(block.uid, 'rounds', block.rounds)}
                    onChange={(e) => rv.put(block.uid, 'rounds', e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value)
                      updateBlock(block.uid, { rounds: isNaN(v) || v < 1 ? 1 : v })
                      rv.clear(block.uid, 'rounds')
                    }}
                    className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--color-text-muted)]">Repos entre séries (sec)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rv.get(block.uid, 'rest', block.restBetweenRoundsS)}
                    onChange={(e) => rv.put(block.uid, 'rest', e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value)
                      updateBlock(block.uid, { restBetweenRoundsS: isNaN(v) || v < 0 ? 0 : v })
                      rv.clear(block.uid, 'rest')
                    }}
                    className="w-full bg-[var(--color-surface-2)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>

            {/* Exercices du bloc */}
            {!block.collapsed && (
              <div className="px-4 pb-4 space-y-3">
                <div className="h-px bg-[var(--color-border)]" />

                {block.exercises.length === 0 && (
                  <p className="text-xs text-center text-[var(--color-text-muted)] py-2">
                    Aucun exercice dans ce bloc
                  </p>
                )}

                {block.exercises.map((ex, exIdx) => {
                  const exUid = ex.uid
                  const isLastInBlock = exIdx === block.exercises.length - 1
                  return (
                    <div
                      key={exUid}
                      draggable={block.exercises.length > 1}
                      onDragStart={() => { dragRef.current = { blockUid: block.uid, fromIdx: exIdx } }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!dragRef.current || dragRef.current.blockUid !== block.uid) return
                        reorderExercisesInBlock(block.uid, dragRef.current.fromIdx, exIdx)
                        dragRef.current = null
                      }}
                      onDragEnd={() => { dragRef.current = null }}
                      className="bg-[var(--color-surface-2)] rounded-xl p-3 space-y-3"
                    >
                      {/* Nom exercice + grip + supprimer */}
                      <div className="flex items-center gap-2">
                        {block.exercises.length > 1 && (
                          <GripVertical size={16} className="text-[var(--color-text-muted)] cursor-grab flex-shrink-0 touch-none" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{ex.exercise.name}</p>
                          {block.exercises.length > 1 && (
                            <p className="text-[10px] text-[var(--color-accent)]">
                              {exIdx + 1}/{block.exercises.length}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExercise(block.uid, exUid)}
                          className="p-1 text-[var(--color-text-muted)] active-scale"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Toggle reps / durée */}
                      <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateExercise(block.uid, exUid, { repMode: 'reps' })}
                          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            ex.repMode === 'reps'
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          Répétitions
                        </button>
                        <button
                          type="button"
                          onClick={() => updateExercise(block.uid, exUid, { repMode: 'duration' })}
                          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            ex.repMode === 'duration'
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          Durée (sec)
                        </button>
                      </div>

                      {/* Objectif + Poids */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-[var(--color-text-muted)]">
                            {ex.repMode === 'reps' ? 'Reps cibles' : 'Durée (sec)'}
                          </label>
                          {ex.repMode === 'reps' ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={rv.get(exUid, 'targetReps', ex.targetReps)}
                              onChange={(e) => rv.put(exUid, 'targetReps', e.target.value.replace(/[^0-9]/g, ''))}
                              onBlur={(e) => {
                                const v = parseInt(e.target.value)
                                updateExercise(block.uid, exUid, { targetReps: isNaN(v) || v < 1 ? 1 : v })
                                rv.clear(exUid, 'targetReps')
                              }}
                              className="w-full bg-[var(--color-surface)] px-2 py-1.5 rounded-lg text-center text-sm outline-none border border-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                            />
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={rv.get(exUid, 'targetDurationS', ex.targetDurationS)}
                              onChange={(e) => rv.put(exUid, 'targetDurationS', e.target.value.replace(/[^0-9]/g, ''))}
                              onBlur={(e) => {
                                const v = parseInt(e.target.value)
                                updateExercise(block.uid, exUid, { targetDurationS: isNaN(v) || v < 1 ? 1 : v })
                                rv.clear(exUid, 'targetDurationS')
                              }}
                              className="w-full bg-[var(--color-surface)] px-2 py-1.5 rounded-lg text-center text-sm outline-none border border-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-[var(--color-text-muted)]">Poids (kg)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rv.get(exUid, 'targetWeight', ex.targetWeight)}
                            placeholder="—"
                            onChange={(e) => rv.put(exUid, 'targetWeight', e.target.value.replace(/[^0-9.,]/g, ''))}
                            onBlur={(e) => {
                              const raw = e.target.value.replace(',', '.')
                              if (raw === '' || raw === '.') {
                                updateExercise(block.uid, exUid, { targetWeight: null })
                              } else {
                                const v = parseFloat(raw)
                                updateExercise(block.uid, exUid, { targetWeight: isNaN(v) ? null : Math.max(0, v) })
                              }
                              rv.clear(exUid, 'targetWeight')
                            }}
                            className="w-full bg-[var(--color-surface)] px-2 py-1.5 rounded-lg text-center text-sm outline-none placeholder-[var(--color-text-muted)]"
                          />
                        </div>
                      </div>

                      {/* Repos après cet exercice (intra-round) — sauf dernier */}
                      {!isLastInBlock && (
                        <div className="space-y-1">
                          <label className="text-xs text-[var(--color-text-muted)]">Repos après l'exercice (sec)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={rv.get(exUid, 'restAfterS', ex.restAfterS)}
                            onChange={(e) => rv.put(exUid, 'restAfterS', e.target.value.replace(/[^0-9]/g, ''))}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value)
                              updateExercise(block.uid, exUid, { restAfterS: isNaN(v) || v < 0 ? 0 : v })
                              rv.clear(exUid, 'restAfterS')
                            }}
                            className="w-full bg-[var(--color-surface)] px-3 py-2 rounded-lg text-center outline-none text-[var(--color-text)]"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Bouton ajouter exercice au bloc */}
                <button
                  type="button"
                  onClick={() => setPickerBlockUid(block.uid)}
                  className="w-full flex items-center justify-center gap-1.5 border border-dashed border-[var(--color-border)] rounded-xl py-2.5 text-sm text-[var(--color-text-muted)] active-scale"
                >
                  <Plus size={14} />
                  Ajouter un exercice
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {blocks.length === 0 && (
          <button
            type="button"
            onClick={addBlock}
            className="w-full border-2 border-dashed border-[var(--color-border)] rounded-2xl p-6 text-[var(--color-text-muted)] text-sm text-center active-scale"
          >
            Appuyer pour ajouter un bloc d'exercices
          </button>
        )}

        {/* Bouton save */}
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale disabled:opacity-50 neon transition-all mt-2"
        >
          {isSubmitting
            ? 'Enregistrement...'
            : isEditing ? 'Mettre à jour' : 'Créer la séance'}
        </button>
      </form>
    </div>
  )
}
