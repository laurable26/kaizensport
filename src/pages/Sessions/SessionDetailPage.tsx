import { useParams, useNavigate } from 'react-router-dom'
import { useSession, estimateSessionDuration } from '@/hooks/useSessions'
import { useStartSessionLog } from '@/hooks/useSessionLog'
import { useSessionStore } from '@/store/sessionStore'
import PageHeader from '@/components/layout/PageHeader'
import { Play, Edit2, Dumbbell, Clock } from 'lucide-react'
import type { ActiveExerciseState } from '@/types/app'
import toast from 'react-hot-toast'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading } = useSession(id)
  const navigate = useNavigate()
  const startSessionLog = useStartSessionLog()
  const startSession = useSessionStore((s) => s.startSession)

  const handleStart = async () => {
    if (!session || !id) return

    try {
      const log = await startSessionLog.mutateAsync(id)

      const exercises: ActiveExerciseState[] = (session.session_exercises ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((se) => ({
          exerciseId: se.exercise_id,
          exercise: se.exercise,
          setsPlanned: se.sets_planned,
          restSeconds: se.rest_seconds,
          completedSets: [],
          repMode: se.target_duration_seconds ? 'duration' : 'reps',
          targetDurationSeconds: se.target_duration_seconds ?? undefined,
        }))

      startSession({
        sessionLogId: log.id,
        sessionId: id,
        sessionName: session.name,
        exercises,
      })

      navigate('/sessions/active')
    } catch {
      toast.error('Impossible de démarrer la séance')
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="..." back />
        <div className="px-4 py-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!session) return null

  const exercises = (session.session_exercises ?? []).sort((a, b) => a.order_index - b.order_index)
  const durationMin = exercises.length > 0
    ? estimateSessionDuration(exercises.map((se) => ({
        sets_planned: se.sets_planned,
        rest_seconds: se.rest_seconds,
        target_reps: se.target_reps ?? null,
        target_duration_seconds: se.target_duration_seconds ?? null,
      })))
    : null

  return (
    <div>
      <PageHeader
        title={session.name}
        back="/sessions"
        action={
          <button
            onClick={() => navigate(`/sessions/${id}/edit`)}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
          >
            <Edit2 size={16} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Résumé rapide */}
        <div className="flex items-center gap-3">
          {durationMin && (
            <div className="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-xl px-3 py-2">
              <Clock size={13} className="text-[var(--color-accent)]" />
              <span className="text-sm font-semibold">~{durationMin} min</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-xl px-3 py-2">
            <Dumbbell size={13} className="text-[var(--color-text-muted)]" />
            <span className="text-sm font-semibold">{exercises.length} exercice{exercises.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {session.notes && (
          <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-xl px-4 py-3">
            {session.notes}
          </p>
        )}

        {/* Exercise list */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
            Exercices
          </h2>
          {exercises.map((se, i) => (
            <div key={se.id} className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{se.exercise?.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {se.sets_planned} séries · Repos {se.rest_seconds}s
                  {se.target_duration_seconds
                    ? ` · ${se.target_duration_seconds}s/tour`
                    : se.target_reps
                    ? ` · ${se.target_reps} reps`
                    : ''}
                  {se.target_weight ? ` · ${se.target_weight} kg` : ''}
                </p>
              </div>
              <Dumbbell size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <div className="footer-btn-container">
        <button
          onClick={handleStart}
          disabled={startSessionLog.isPending || exercises.length === 0}
          className="w-full bg-[var(--color-accent)] text-white font-bold py-4 rounded-xl active-scale disabled:opacity-50 flex items-center justify-center gap-2 text-base neon transition-all"
        >
          <Play size={20} className="ml-0.5" />
          {startSessionLog.isPending ? 'Démarrage...' : 'Démarrer la séance'}
        </button>
      </div>
    </div>
  )
}
