import { useNavigate, useParams } from 'react-router-dom'
import { useRunningSession, useStartRunningLog } from '@/hooks/useRunning'
import { useRunningStore } from '@/store/runningStore'
import PageHeader from '@/components/layout/PageHeader'
import { Footprints, MapPin, Timer, Zap, ChevronRight, Edit2, Play } from 'lucide-react'
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
    try {
      const log = await startRunningLog.mutateAsync(session.id)
      startRun({
        runLogId: log.id,
        runningSessionId: session.id,
        sessionName: session.name,
        sessionType: session.type as 'free' | 'distance' | 'duration' | 'interval',
        blocks: expanded,
      })
      navigate('/running/active')
    } catch {
      toast.error('Erreur lors du démarrage')
    }
  }

  return (
    <div>
      <PageHeader
        title={session.name}
        back
        action={
          <button
            onClick={() => navigate(`/running/${session.id}/edit`)}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active-scale"
          >
            <Edit2 size={16} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Type badge + meta */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              session.type === 'interval'
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
            }`}>
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
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      block.phase === 'work' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-success)]'
                    }`} />
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

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 bg-[var(--color-bg)]/80 backdrop-blur-sm border-t border-[var(--color-border)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <button
          onClick={handleStart}
          disabled={startRunningLog.isPending}
          className="w-full bg-[var(--color-success)] text-white font-bold py-4 rounded-xl active-scale flex items-center justify-center gap-2 text-base"
        >
          <Play size={20} />
          {startRunningLog.isPending ? 'Démarrage...' : 'Lancer la course'}
        </button>
      </div>
    </div>
  )
}
