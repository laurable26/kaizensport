import { useParams, useNavigate } from 'react-router-dom'
import { useSession, estimateSessionDuration, sessionToActiveBlocks } from '@/hooks/useSessions'
import { useStartSessionLog } from '@/hooks/useSessionLog'
import { useSessionStore } from '@/store/sessionStore'
import { useRunningStore } from '@/store/runningStore'
import { useFriends } from '@/hooks/useFriends'
import { useShareSession } from '@/hooks/useSharedSessions'
import PageHeader from '@/components/layout/PageHeader'
import { Play, Edit2, Dumbbell, Clock, Share2, X, Calendar, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, isError } = useSession(id)
  const navigate = useNavigate()
  const startSessionLog = useStartSessionLog()
  const startSession = useSessionStore((s) => s.startSession)

  // Partage
  const { data: friends = [] } = useFriends()
  const shareSession = useShareSession()
  const [showShare, setShowShare] = useState(false)
  const [shareDate, setShareDate] = useState('')
  const [shareTime, setShareTime] = useState('')
  const [sharedTo, setSharedTo] = useState<Set<string>>(new Set())

  const handleStart = async () => {
    if (!session || !id) return
    if (useRunningStore.getState().isActive) {
      toast.error('Une course est déjà en cours. Arrête-la d\'abord.')
      return
    }

    try {
      const log = await startSessionLog.mutateAsync(id)
      const blocks = sessionToActiveBlocks(session)

      startSession({
        sessionLogId: log.id,
        sessionId: id,
        sessionName: session.name,
        blocks,
      })

      navigate('/sessions/active')
    } catch {
      toast.error('Impossible de démarrer la séance')
    }
  }

  const handleShare = async (friendId: string, friendName: string) => {
    if (!id) return
    try {
      await shareSession.mutateAsync({
        sessionId: id,
        inviteeId: friendId,
        suggestedDate: shareDate || undefined,
        suggestedTime: shareTime || undefined,
      })
      setSharedTo((prev) => new Set([...prev, friendId]))
      toast.success(`Invitation envoyée à ${friendName} !`)
    } catch (err: any) {
      if (err?.code === '23505') {
        toast('Invitation déjà envoyée à cet ami', { icon: 'ℹ️' })
      } else {
        toast.error('Erreur lors du partage')
      }
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

  if (!session) {
    return (
      <div>
        <PageHeader title="Séance" back="/sessions" />
        <div className="px-4 py-12 text-center space-y-3">
          <p className="text-[var(--color-text-muted)] text-sm">
            {isError
              ? 'Impossible de charger la séance. La migration de la base de données est peut-être requise.'
              : 'Séance introuvable.'}
          </p>
          <button
            onClick={() => navigate('/sessions')}
            className="text-[var(--color-accent)] text-sm font-semibold"
          >
            Retour aux séances
          </button>
        </div>
      </div>
    )
  }

  const blocks = (session.session_blocks ?? []).sort((a, b) => a.block_index - b.block_index)
  const totalExercises = blocks.reduce((acc, b) => acc + (b.session_block_exercises ?? []).length, 0)
  const durationMin = blocks.length > 0
    ? estimateSessionDuration(blocks.map((b) => ({
        rounds: b.rounds,
        rest_between_rounds_s: b.rest_between_rounds_s,
        session_block_exercises: (b.session_block_exercises ?? []).map((ex) => ({
          target_duration_s: ex.target_duration_s,
          rest_after_s: ex.rest_after_s,
        })),
      })))
    : null

  const canStart = totalExercises > 0

  return (
    <div>
      <PageHeader
        title={session.name}
        back="/sessions"
        action={
          <div className="flex items-center gap-2">
            {friends.length > 0 && (
              <button
                onClick={() => setShowShare(true)}
                className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
                title="Partager la séance"
              >
                <Share2 size={16} className="text-[var(--color-accent)]" />
              </button>
            )}
            <button
              onClick={() => navigate(`/sessions/${id}/edit`)}
              className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
            >
              <Edit2 size={16} />
            </button>
          </div>
        }
      />

      {/* Modal partage */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-[var(--color-surface)] rounded-t-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Partager la séance</h3>
              <button onClick={() => setShowShare(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Ton ami recevra une copie de la séance et pourra la planifier dans son agenda.
              Les exercices manquants seront créés automatiquement dans son compte.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Date suggérée (optionnel)</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="date"
                    value={shareDate}
                    onChange={(e) => setShareDate(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] pl-9 pr-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                  />
                </div>
                <input
                  type="time"
                  value={shareTime}
                  onChange={(e) => setShareTime(e.target.value)}
                  className="w-28 bg-[var(--color-surface-2)] px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Inviter un ami</p>
              {friends.map((f) => {
                const alreadySent = sharedTo.has(f.friend.id)
                return (
                  <button
                    key={f.id}
                    disabled={shareSession.isPending || alreadySent}
                    onClick={() => handleShare(f.friend.id, f.friend.full_name ?? f.friend.email ?? 'cet ami')}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 active-scale transition-colors ${
                      alreadySent
                        ? 'bg-[var(--color-success)]/10'
                        : 'bg-[var(--color-surface-2)]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--color-accent)] font-bold text-sm uppercase">
                        {(f.friend.full_name ?? f.friend.email ?? '?')[0]}
                      </span>
                    </div>
                    <span className="flex-1 text-left font-medium text-sm">
                      {f.friend.full_name ?? f.friend.email}
                    </span>
                    {alreadySent
                      ? <Check size={16} className="text-[var(--color-success)]" />
                      : <Share2 size={14} className="text-[var(--color-accent)]" />
                    }
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Résumé rapide */}
        <div className="flex items-center gap-3 flex-wrap">
          {durationMin != null && durationMin > 0 && (
            <div className="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-xl px-3 py-2">
              <Clock size={13} className="text-[var(--color-accent)]" />
              <span className="text-sm font-semibold">~{durationMin} min</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-xl px-3 py-2">
            <Dumbbell size={13} className="text-[var(--color-text-muted)]" />
            <span className="text-sm font-semibold">
              {blocks.length} bloc{blocks.length !== 1 ? 's' : ''} · {totalExercises} exercice{totalExercises !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {session.notes && (
          <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-xl px-4 py-3">
            {session.notes}
          </p>
        )}

        {/* Liste des blocs */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
            Programme
          </h2>
          {blocks.map((b, bi) => (
            <div key={b.id} className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{b.label || `Bloc ${bi + 1}`}</p>
                <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-full">
                  {b.rounds} série{b.rounds !== 1 ? 's' : ''} · {b.rest_between_rounds_s}s repos
                </span>
              </div>
              {(b.session_block_exercises ?? []).map((ex, ei) => (
                <div key={ex.id} className="flex items-center gap-2 py-0.5">
                  <span className="w-5 h-5 rounded-md bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{ei + 1}</span>
                  </span>
                  <span className="text-sm flex-1 truncate">{ex.exercise?.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {ex.target_duration_s
                      ? `${ex.target_duration_s}s`
                      : ex.target_reps
                      ? `×${ex.target_reps}`
                      : ''}
                    {ex.target_weight ? ` · ${ex.target_weight} kg` : ''}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bouton démarrer */}
      <div className="footer-btn-container">
        <button
          onClick={handleStart}
          disabled={startSessionLog.isPending || !canStart}
          className="w-full bg-[var(--color-accent)] text-white font-bold py-4 rounded-xl active-scale disabled:opacity-50 flex items-center justify-center gap-2 text-base neon transition-all"
        >
          <Play size={20} className="ml-0.5" />
          {startSessionLog.isPending ? 'Démarrage...' : 'Démarrer la séance'}
        </button>
      </div>
    </div>
  )
}
