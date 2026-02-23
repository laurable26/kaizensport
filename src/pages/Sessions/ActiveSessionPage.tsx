import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/store/sessionStore'
import { useTimerStore } from '@/store/timerStore'
import { useLogSet, useCompleteSessionLog } from '@/hooks/useSessionLog'
import SetTracker from '@/components/session/SetTracker'
import RestTimer from '@/components/timer/RestTimer'
import FeelingRater from '@/components/session/FeelingRater'
import { useState } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ActiveSet } from '@/types/app'
import { useFriends, useInviteToSession } from '@/hooks/useFriends'

export default function ActiveSessionPage() {
  const navigate = useNavigate()
  const {
    isActive,
    sessionLogId,
    sessionName,
    exercises,
    currentExerciseIndex,
    logSet,
    nextExercise,
    previousExercise,
    completeSession,
    reset,
  } = useSessionStore()
  const startTimer = useTimerStore((s) => s.start)
  // startTimer(seconds, mode, onEnd) — mode: 'rest' | 'work'
  const { mutateAsync: logSetToDb } = useLogSet()
  const completeSessionLog = useCompleteSessionLog()
  const [overallFeeling, setOverallFeeling] = useState<number | null>(null)
  const [showComplete, setShowComplete] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const { data: friends = [] } = useFriends()
  const inviteToSession = useInviteToSession()

  if (!isActive) {
    navigate('/sessions', { replace: true })
    return null
  }

  const currentExercise = exercises[currentExerciseIndex]
  if (!currentExercise) return null

  const lastSet = currentExercise.completedSets[currentExercise.completedSets.length - 1]

  const handleSetComplete = async (set: ActiveSet) => {
    if (!sessionLogId) return

    logSet(currentExerciseIndex, set)

    try {
      await logSetToDb({
        session_log_id: sessionLogId,
        exercise_id: currentExercise.exerciseId,
        set_number: set.setNumber,
        weight: set.weight || null,
        reps: set.reps || null,
        feeling: set.feeling,
        rest_seconds: currentExercise.restSeconds,
      })
    } catch {
      // Log locally, retry later
    }

    if (currentExercise.repMode === 'duration' && currentExercise.targetDurationSeconds) {
      // Mode durée : lancer d'abord le timer travail, puis le repos à la fin
      startTimer(
        currentExercise.targetDurationSeconds,
        'work',
        () => startTimer(currentExercise.restSeconds, 'rest'),
      )
    } else {
      // Mode reps : lancer directement le repos
      startTimer(currentExercise.restSeconds, 'rest')
    }
  }

  const handleFinish = async () => {
    if (!sessionLogId) return
    try {
      await completeSessionLog.mutateAsync({
        sessionLogId,
        overallFeeling: overallFeeling ?? undefined,
      })
      completeSession()
      reset()
      toast.success('Séance terminée !')
      navigate('/history', { replace: true })
    } catch {
      toast.error('Erreur lors de la finalisation')
    }
  }

  const nextSetNumber = currentExercise.completedSets.length + 1
  const allSetsCompleted = nextSetNumber > currentExercise.setsPlanned

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] glass sticky top-0 z-20"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 1rem)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[var(--color-text-muted)]">{sessionName}</p>
          {friends.length > 0 && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1 text-[var(--color-accent)] text-xs font-semibold"
            >
              <UserPlus size={13} />
              Inviter
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={previousExercise}
            disabled={currentExerciseIndex === 0}
            className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-base">{currentExercise.exercise.name}</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Exercice {currentExerciseIndex + 1} / {exercises.length}
            </p>
          </div>
          <button
            onClick={nextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
            className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={() => setShowInvite(false)}>
          <div
            className="bg-[var(--color-surface)] rounded-t-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Inviter un ami</h3>
              <button onClick={() => setShowInvite(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2">
              {friends.map((f) => (
                <button
                  key={f.id}
                  disabled={inviteToSession.isPending}
                  onClick={async () => {
                    if (!sessionLogId) return
                    try {
                      await inviteToSession.mutateAsync({ sessionLogId, inviteeId: f.friend.id })
                      toast.success(`Invitation envoyée à ${f.friend.full_name ?? f.friend.email}`)
                      setShowInvite(false)
                    } catch {
                      toast.error('Erreur lors de l\'envoi')
                    }
                  }}
                  className="w-full flex items-center gap-3 bg-[var(--color-surface-2)] rounded-xl px-4 py-3 active-scale"
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--color-accent)] font-bold text-sm uppercase">
                      {(f.friend.full_name ?? f.friend.email ?? '?')[0]}
                    </span>
                  </div>
                  <span className="font-medium text-sm">{f.friend.full_name ?? f.friend.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Completed sets */}
        {currentExercise.completedSets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-bold">
              Séries complétées
            </p>
            {currentExercise.completedSets.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--color-surface)] rounded-xl px-4 py-2.5">
                <span className="text-xs text-[var(--color-text-muted)]">Série {s.setNumber}</span>
                <span className="font-semibold text-sm">{s.weight} kg × {s.reps}</span>
                {s.feeling && (
                  <span>{s.feeling === 5 ? '💪' : s.feeling === 4 ? '😊' : s.feeling === 3 ? '😐' : s.feeling === 2 ? '😤' : '😓'}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Next set or all done */}
        {!allSetsCompleted ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-bold">
              Série {nextSetNumber} / {currentExercise.setsPlanned}
              {currentExercise.repMode === 'duration' && currentExercise.targetDurationSeconds && (
                <span className="ml-2 normal-case font-normal text-[var(--color-accent)]">
                  · {currentExercise.targetDurationSeconds}s/tour
                </span>
              )}
            </p>
            <SetTracker
              setNumber={nextSetNumber}
              previousSet={lastSet ? { weight: lastSet.weight, reps: lastSet.reps } : null}
              restSeconds={currentExercise.restSeconds}
              repMode={currentExercise.repMode}
              targetDurationSeconds={currentExercise.targetDurationSeconds}
              onComplete={handleSetComplete}
            />
          </div>
        ) : (
          <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-2xl p-5 text-center space-y-3">
            <CheckCircle size={32} className="mx-auto text-[var(--color-success)]" />
            <p className="font-semibold">Exercice terminé !</p>
            {currentExerciseIndex < exercises.length - 1 && (
              <button
                onClick={nextExercise}
                className="bg-[var(--color-success)] text-white font-semibold px-6 py-3 rounded-xl active-scale"
              >
                Exercice suivant
              </button>
            )}
          </div>
        )}

        {/* Finish session */}
        {showComplete ? (
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-center">Ressenti global</h3>
            <FeelingRater value={overallFeeling} onChange={setOverallFeeling} />
            <button
              onClick={handleFinish}
              disabled={completeSessionLog.isPending}
              className="w-full bg-[var(--color-accent)] text-white font-bold py-4 rounded-xl active-scale"
            >
              {completeSessionLog.isPending ? 'Finalisation...' : 'Terminer la séance'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowComplete(true)}
            className="w-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-semibold py-4 rounded-xl active-scale"
          >
            Terminer la séance
          </button>
        )}
      </div>

      {/* Rest timer overlay */}
      <RestTimer />
    </div>
  )
}
