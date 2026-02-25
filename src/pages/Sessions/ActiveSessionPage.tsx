import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/store/sessionStore'
import { useTimerStore } from '@/store/timerStore'
import { useLogSet } from '@/hooks/useSessionLog'
import { useCompleteSessionLog } from '@/hooks/useSessionLog'
import RestTimer from '@/components/timer/RestTimer'
import FeelingRater from '@/components/session/FeelingRater'
import { useState, useRef } from 'react'
import { CheckCircle, ChevronRight, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFriends, useInviteToSession } from '@/hooks/useFriends'

export default function ActiveSessionPage() {
  const navigate = useNavigate()
  const {
    isActive,
    sessionLogId,
    sessionName,
    blocks,
    currentBlockIndex,
    currentRound,
    currentExerciseIndex,
    phase,
    logExercise,
    advance,
    completeSession,
    reset,
  } = useSessionStore()

  const startTimer = useTimerStore((s) => s.start)
  const { mutateAsync: logSetToDb } = useLogSet()
  const completeSessionLog = useCompleteSessionLog()

  const lastWeightRef = useRef<number>(0)
  const [overallFeeling, setOverallFeeling] = useState<number | null>(null)
  const [showComplete, setShowComplete] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  // Inputs de la série courante
  const [inputReps, setInputReps] = useState('')
  const [inputWeight, setInputWeight] = useState('')
  const [inputFeeling, setInputFeeling] = useState<number | null>(null)

  const { data: friends = [] } = useFriends()
  const inviteToSession = useInviteToSession()

  if (!isActive) {
    navigate('/sessions', { replace: true })
    return null
  }

  const block = blocks[currentBlockIndex]
  if (!block) return null

  const exercise = block.exercises[currentExerciseIndex]
  if (!exercise) return null

  const isDuration = exercise.repMode === 'duration'
  const isDone = phase === 'done'
  const totalBlocks = blocks.length
  const totalRounds = block.rounds

  // Log précédent de cet exercice pour ce round (si re-passe)
  const prevLog = exercise.logs[currentRound]

  // ── Valider un exercice ────────────────────────────────────────────────

  const handleValidate = async () => {
    const reps = parseInt(inputReps) || (isDuration ? (exercise.targetDurationS ?? 0) : (exercise.targetReps ?? 0))
    const weight = parseFloat(inputWeight.replace(',', '.')) || lastWeightRef.current
    lastWeightRef.current = weight

    const result = { reps, weight, feeling: inputFeeling }

    // Log en mémoire
    logExercise(currentBlockIndex, currentRound, currentExerciseIndex, result)

    // Log en DB
    if (sessionLogId) {
      logSetToDb({
        session_log_id: sessionLogId,
        exercise_id: exercise.exerciseId,
        set_number: currentRound,
        weight: weight || null,
        reps: reps || null,
        feeling: inputFeeling,
        rest_seconds: exercise.restAfterS || block.restBetweenRoundsS,
        block_id: block.blockId,
        round_number: currentRound,
      }).catch(() => {})
    }

    // Réinitialiser les inputs
    setInputReps('')
    setInputFeeling(null)
    setInputWeight('')

    // Calculer la suite
    const { phase: nextPhase, restSeconds } = advance()

    if (nextPhase === 'rest_after_exercise' && restSeconds > 0) {
      startTimer(restSeconds, 'rest')
    } else if (nextPhase === 'rest_after_round' && restSeconds > 0) {
      startTimer(restSeconds, 'rest')
    }
    // Si nextPhase === 'exercise' ou 'done' : pas de timer
  }

  // ── Mode durée : lancer le timer work directement ─────────────────────

  const handleStartDuration = () => {
    const targetS = exercise.targetDurationS ?? 30
    startTimer(targetS, 'work', handleValidate)
  }

  // ── Terminer la séance ─────────────────────────────────────────────────

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

  // ── Rendu ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] glass sticky top-0 z-20"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 1rem)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[60%]">{sessionName}</p>
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
        {/* Indicateur bloc · série */}
        <div className="text-center space-y-0.5">
          <p className="text-xs text-[var(--color-text-muted)]">
            Bloc {currentBlockIndex + 1}/{totalBlocks}
            {block.label ? ` — ${block.label}` : ''}
          </p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm font-bold">
              Série {currentRound}/{totalRounds}
            </span>
            {block.exercises.length > 1 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                · {currentExerciseIndex + 1}/{block.exercises.length} exercices
              </span>
            )}
          </div>
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

        {/* Bloc terminé → passer au suivant */}
        {isDone ? (
          <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-2xl p-5 text-center space-y-3">
            <CheckCircle size={32} className="mx-auto text-[var(--color-accent)]" />
            <p className="font-bold text-base">Programme terminé ! 💪</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Toutes les séries de tous les blocs sont complétées.
            </p>
          </div>
        ) : (
          <>
            {/* Exercice courant */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-4">
              <div>
                <h2 className="font-bold text-lg">{exercise.exercise.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  {isDuration
                    ? `${exercise.targetDurationS}s`
                    : exercise.targetReps
                    ? `× ${exercise.targetReps} reps`
                    : ''}
                  {exercise.targetWeight ? ` · ${exercise.targetWeight} kg` : ''}
                </p>
              </div>

              {/* Log précédent */}
              {prevLog && (
                <div className="bg-[var(--color-surface-2)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  Série précédente : {prevLog.weight} kg × {prevLog.reps}
                </div>
              )}

              {/* Mode durée */}
              {isDuration ? (
                <button
                  onClick={handleStartDuration}
                  className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale neon"
                >
                  ▶ Lancer {exercise.targetDurationS}s
                </button>
              ) : (
                /* Mode reps : saisie */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--color-text-muted)]">Répétitions</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputReps}
                        onChange={(e) => setInputReps(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder={String(exercise.targetReps ?? '')}
                        className="w-full bg-[var(--color-surface-2)] px-3 py-3 rounded-xl text-center text-lg font-bold outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--color-text-muted)]">Poids (kg)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputWeight}
                        onChange={(e) => setInputWeight(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder={exercise.targetWeight ? String(exercise.targetWeight) : '0'}
                        className="w-full bg-[var(--color-surface-2)] px-3 py-3 rounded-xl text-center text-lg font-bold outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>

                  {/* Ressenti */}
                  <FeelingRater value={inputFeeling} onChange={setInputFeeling} />

                  <button
                    onClick={handleValidate}
                    className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale neon flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Valider la série
                  </button>
                </div>
              )}
            </div>

            {/* Prochaine étape */}
            {block.exercises.length > 1 && currentExerciseIndex < block.exercises.length - 1 && (
              <div className="flex items-center gap-2 px-1 text-sm text-[var(--color-text-muted)]">
                <ChevronRight size={14} className="flex-shrink-0" />
                <span>Prochain : <span className="font-semibold text-[var(--color-text)]">{block.exercises[currentExerciseIndex + 1].exercise.name}</span></span>
              </div>
            )}

            {/* Séries complétées pour cet exercice (rounds précédents) */}
            {Object.keys(exercise.logs).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-bold">
                  Séries complétées
                </p>
                {Object.entries(exercise.logs)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([round, log]) => (
                    <div key={round} className="flex items-center justify-between bg-[var(--color-surface)] rounded-xl px-4 py-2.5">
                      <span className="text-xs text-[var(--color-text-muted)]">Série {round}</span>
                      <span className="font-semibold text-sm">
                        {log.weight > 0 ? `${log.weight} kg × ` : ''}{log.reps}
                      </span>
                      {log.feeling && (
                        <span>{log.feeling === 5 ? '💪' : log.feeling === 4 ? '😊' : log.feeling === 3 ? '😐' : log.feeling === 2 ? '😤' : '😓'}</span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Terminer la séance */}
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

      {/* Timer repos overlay */}
      <RestTimer />
    </div>
  )
}
