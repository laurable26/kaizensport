import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRunningSession, useStartRunningLog } from '@/hooks/useRunning'
import { useRunningStore } from '@/store/runningStore'
import { useSessionStore } from '@/store/sessionStore'
import { useFriends } from '@/hooks/useFriends'
import { useShareRunningSession } from '@/hooks/useSharedRunningSessions'
import PageHeader from '@/components/layout/PageHeader'
import { Footprints, MapPin, Timer, Zap, ChevronRight, Edit2, Play, Share2, X, Calendar, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import type { RunningIntervalBlock } from '@/types/database'
import type { ExpandedIntervalBlock } from '@/types/app'

const TYPE_LABELS: Record<string, string> = {
  free: 'Course libre',
  distance: 'Objectif distance',
  duration: 'Objectif durée',
  interval: 'Fractionné',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  if (m > 0) return `${m} min${s > 0 ? ` ${s}s` : ''}`
  return `${s}s`
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = secPerKm % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function expandBlocks(blocks: RunningIntervalBlock[]): ExpandedIntervalBlock[] {
  const expanded: ExpandedIntervalBlock[] = []
  const sorted = blocks.slice().sort((a, b) => a.order_index - b.order_index)
  for (const block of sorted) {
    for (let rep = 1; rep <= block.repetitions; rep++) {
      expanded.push({
        ...block,
        id: `${block.id}-${rep}`,
        repetitionIndex: rep,
        totalRepetitions: block.repetitions,
      })
    }
  }
  return expanded
}

export default function RunningDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading } = useRunningSession(id ?? '')
  const startRunningLog = useStartRunningLog()
  const startRun = useRunningStore((s) => s.startRun)

  // Partage
  const { data: friends = [] } = useFriends()
  const shareRunningSession = useShareRunningSession()
  const [showShare, setShowShare] = useState(false)
  const [shareDate, setShareDate] = useState('')
  const [shareTime, setShareTime] = useState('')
  const [sharedTo, setSharedTo] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Chargement..." />
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <PageHeader title="Plan introuvable" />
        <p className="px-4 py-8 text-center text-[var(--color-text-muted)]">Ce plan n&apos;existe pas.</p>
      </div>
    )
  }

  const blocks = session.running_interval_blocks ?? []
  const expanded = session.type === 'interval' ? expandBlocks(blocks) : []

  const totalIntervalTime = expanded.reduce((acc, b) => acc + b.duration_s, 0)
  const totalTime =
    (session.warmup_duration_s ?? 0) +
    totalIntervalTime +
    (session.cooldown_duration_s ?? 0)

  const handleStart = async () => {
    if (useSessionStore.getState().isActive) {
      toast.error('Une séance muscu est déjà en cours. Termine-la d\'abord.')
      return
    }
    try {
      const log = await startRunningLog.mutateAsync(session.id)

      // Construire les blocs complets avec échauffement et retour au calme
      const warmupBlock: ExpandedIntervalBlock[] = session.warmup_duration_s && session.warmup_duration_s > 0
        ? [{
            id: 'warmup',
            running_session_id: session.id,
            order_index: -1,
            label: 'Échauffement',
            phase: 'rest' as const,
            duration_s: session.warmup_duration_s,
            target_pace_min_km: null,
            repetitions: 1,
            repetitionIndex: 1,
            totalRepetitions: 1,
          }]
        : []

      const cooldownBlock: ExpandedIntervalBlock[] = session.cooldown_duration_s && session.cooldown_duration_s > 0
        ? [{
            id: 'cooldown',
            running_session_id: session.id,
            order_index: 999,
            label: 'Retour au calme',
            phase: 'rest' as const,
            duration_s: session.cooldown_duration_s,
            target_pace_min_km: null,
            repetitions: 1,
            repetitionIndex: 1,
            totalRepetitions: 1,
          }]
        : []

      const allBlocks = [...warmupBlock, ...expanded, ...cooldownBlock]

      startRun({
        runLogId: log.id,
        runningSessionId: session.id,
        sessionName: session.name,
        sessionType: session.type as 'free' | 'distance' | 'duration' | 'interval',
        blocks: allBlocks,
        targetDistanceM: session.target_distance_m ?? null,
        targetDurationS: session.target_duration_s ?? null,
      })
      navigate('/running/active')
    } catch {
      toast.error('Erreur lors du démarrage')
    }
  }

  const handleShare = async (friendId: string, friendName: string) => {
    if (!id) return
    try {
      await shareRunningSession.mutateAsync({
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

  return (
    <div>
      <PageHeader
        title={session.name}
        back
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => navigate(`/running/${session.id}/edit`)}
              className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
            >
              <Edit2 size={16} />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Type badge + meta */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
              {session.type === 'free' ? <Footprints size={20} />
                : session.type === 'distance' ? <MapPin size={20} />
                : session.type === 'duration' ? <Timer size={20} />
                : <Zap size={20} />}
            </div>
            <div>
              <p className="font-semibold">{TYPE_LABELS[session.type]}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {session.type === 'distance' && session.target_distance_m && (
                  `${(session.target_distance_m / 1000).toFixed(1)} km`
                )}
                {session.type === 'duration' && session.target_duration_s && (
                  formatDuration(session.target_duration_s)
                )}
                {session.type === 'interval' && (
                  `~${formatDuration(totalTime)}`
                )}
                {session.type === 'free' && 'Sans objectif'}
              </p>
            </div>
          </div>

          {session.notes && (
            <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5">
              {session.notes}
            </p>
          )}
        </div>

        {/* Interval blocks detail */}
        {session.type === 'interval' && (
          <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <p className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
                Programme
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {session.warmup_duration_s && session.warmup_duration_s > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-sm flex-1">Échauffement</span>
                  <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                    {formatDuration(session.warmup_duration_s)}
                  </span>
                </div>
              )}
              {blocks
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((block, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{block.label ?? (block.phase === 'work' ? 'Travail' : 'Repos')}</span>
                      {block.target_pace_min_km && (
                        <span className="text-xs text-[var(--color-text-muted)] ml-2">
                          @ {formatPace(Number(block.target_pace_min_km))}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text-muted)] flex-shrink-0">
                      {block.repetitions}× {formatDuration(block.duration_s)}
                    </span>
                  </div>
                ))}
              {session.cooldown_duration_s && session.cooldown_duration_s > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm flex-1">Retour au calme</span>
                  <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                    {formatDuration(session.cooldown_duration_s)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-2)]">
                <span className="text-xs font-bold text-[var(--color-text-muted)] flex-1 uppercase">Total</span>
                <span className="text-sm font-bold">~{formatDuration(totalTime)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA Lancer la course — footer fixe au-dessus du BottomNav */}
      <div className="footer-btn-container">
        <button
          onClick={handleStart}
          disabled={startRunningLog.isPending}
          className="w-full bg-[var(--color-accent)] text-white font-bold py-4 rounded-xl active-scale neon transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
        >
          <Play size={20} />
          {startRunningLog.isPending ? 'Démarrage...' : 'Lancer la course'}
        </button>
      </div>

      {/* Modal de partage */}
      {showShare && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-[var(--color-surface)] rounded-t-3xl p-5 space-y-4 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            {/* Handle + titre */}
            <div className="flex items-center justify-between">
              <p className="font-bold text-base">Partager ce plan</p>
              <button onClick={() => setShowShare(false)} className="p-1 text-[var(--color-text-muted)]">
                <X size={20} />
              </button>
            </div>

            {/* Date suggérée (optionnel) */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={12} />
                Date suggérée (optionnel)
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={shareDate}
                  onChange={(e) => setShareDate(e.target.value)}
                  className="flex-1 bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
                />
                <input
                  type="time"
                  value={shareTime}
                  onChange={(e) => setShareTime(e.target.value)}
                  className="w-28 bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-sm border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
                />
              </div>
            </div>

            {/* Liste d'amis */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Envoyer à
              </p>
              {friends.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                  Aucun ami pour l'instant
                </p>
              ) : (
                friends.map((f) => {
                  const friendId = f.friend?.id ?? ''
                  const friendName = f.friend?.full_name ?? f.friend?.email ?? ''
                  const alreadySent = sharedTo.has(friendId)
                  return (
                    <div key={f.id} className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-2xl p-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[var(--color-accent)] font-bold text-sm uppercase">
                          {(friendName)[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{friendName}</p>
                      </div>
                      <button
                        onClick={() => handleShare(friendId, friendName)}
                        disabled={alreadySent || shareRunningSession.isPending}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg active-scale transition-colors disabled:opacity-60 ${
                          alreadySent
                            ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                            : 'bg-[var(--color-accent)] text-white'
                        }`}
                      >
                        {alreadySent ? <><Check size={13} /> Envoyé</> : 'Envoyer'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
