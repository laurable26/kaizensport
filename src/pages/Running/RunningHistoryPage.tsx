import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useRunningLogs, useRunningLogDetail, useRunningPRs, useRunningStats } from '@/hooks/useRunning'
import PageHeader from '@/components/layout/PageHeader'
import { Footprints, Trophy, TrendingUp, Calendar, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import RunMap from '@/components/running/RunMap'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm) return '--:--'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}'${String(s).padStart(2, '0')}`
}

function formatDistance(metres: number | null | undefined): string {
  if (!metres) return '-- km'
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(2)} km`
}

const PR_LABELS: Record<string, string> = {
  '5k': '5 km',
  '10k': '10 km',
  'semi': 'Semi-marathon',
  'marathon': 'Marathon',
}

function formatPrTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}`
  return `${m}'${String(s).padStart(2, '0')}`
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function LogDetail({ logId, onClose }: { logId: string; onClose: () => void }) {
  const { data: log } = useRunningLogDetail(logId)

  if (!log) return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-3xl p-6 w-full animate-pulse h-48" />
    </div>
  )

  const gpsTrack = (log as any).gps_track as { lat: number; lng: number }[] | null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-3xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Map */}
        {gpsTrack && gpsTrack.length >= 2 ? (
          <RunMap points={gpsTrack} height={144} className="rounded-none" />
        ) : (
          <div className="h-36 bg-[var(--color-surface-2)] flex items-center justify-center opacity-30">
            <Footprints size={32} />
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{log.running_sessions?.name ?? 'Course libre'}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {log.started_at ? format(parseISO(log.started_at), 'EEEE d MMMM yyyy', { locale: fr }) : ''}
              </p>
            </div>
            {log.overall_feeling && (
              <span className="text-2xl">
                {['😩', '😕', '😐', '😊', '🔥'][log.overall_feeling - 1]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Distance', value: formatDistance(log.distance_m) },
              { label: 'Durée', value: formatDuration(log.duration_s) },
              { label: 'Allure moy.', value: formatPace(log.avg_pace_s_per_km) },
              { label: 'Meilleure', value: formatPace(log.best_pace_s_per_km) },
              { label: 'Dénivelé +', value: log.elevation_gain_m ? `+${Math.round(log.elevation_gain_m)} m` : '--' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--color-surface-2)] rounded-xl p-3 text-center">
                <p className="font-bold text-sm">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {log.notes && (
            <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5">
              {log.notes}
            </p>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[var(--color-surface-2)] font-semibold text-sm active-scale"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Tab = 'history' | 'prs' | 'stats'

export default function RunningHistoryPage() {
  const location = useLocation()
  const { openLogId } = (location.state ?? {}) as { openLogId?: string }
  const [tab, setTab] = useState<Tab>('history')
  const [selectedLogId, setSelectedLogId] = useState<string | null>(openLogId ?? null)

  const { data: logs = [], isLoading: logsLoading } = useRunningLogs(100)
  const { data: prs = [] } = useRunningPRs()
  const { data: stats } = useRunningStats()

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'history', label: 'Courses', icon: <Footprints size={15} /> },
    { id: 'prs', label: 'Records', icon: <Trophy size={15} /> },
    { id: 'stats', label: 'Stats', icon: <TrendingUp size={15} /> },
  ]

  return (
    <div>
      <PageHeader title="Historique course" />

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24">
        {/* ── Historique ── */}
        {tab === 'history' && (
          <div className="space-y-3">
            {logsLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
              ))
            ) : logs.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Footprints size={48} className="mx-auto text-[var(--color-text-muted)] opacity-40" />
                <p className="text-[var(--color-text-muted)]">Aucune course enregistrée</p>
              </div>
            ) : (
              logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLogId(log.id)}
                  className="w-full bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4 active-scale text-left"
                >
                  {/* Mini map */}
                  <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--color-surface-2)]">
                    {(log as any).gps_track?.length >= 2
                      ? <RunMap points={(log as any).gps_track} height={48} className="rounded-xl" />
                      : <div className="w-full h-full flex items-center justify-center opacity-30"><Footprints size={16} /></div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">
                        {log.running_sessions?.name ?? 'Course libre'}
                      </p>
                      <ChevronRight size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {log.started_at ? format(parseISO(log.started_at), 'd MMM yyyy', { locale: fr }) : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-bold text-[var(--color-accent)]">
                        {formatDistance(log.distance_m)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatDuration(log.duration_s)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatPace(log.avg_pace_s_per_km)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Records personnels ── */}
        {tab === 'prs' && (
          <div className="space-y-3">
            {Object.entries(PR_LABELS).map(([key, label]) => {
              const pr = prs.find((p) => p.distance === key)
              return (
                <div key={key} className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    pr
                      ? 'bg-yellow-500/15 text-yellow-500'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                  }`}>
                    <Trophy size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{label}</p>
                    {pr ? (
                      <>
                        <p className="text-lg font-bold text-yellow-500">
                          {formatPrTime(pr.duration_s)}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {pr.achieved_at
                            ? format(parseISO(pr.achieved_at), 'd MMM yyyy', { locale: fr })
                            : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--color-text-muted)]">Pas encore de record</p>
                    )}
                  </div>
                  {pr && (
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatPace(pr.duration_s / (Object.values({ '5k': 5, '10k': 10, 'semi': 21.097, 'marathon': 42.195 })[Object.keys(PR_LABELS).indexOf(key)]))}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">allure moy.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Stats ── */}
        {tab === 'stats' && (
          <div className="space-y-4">
            {/* Cette semaine */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[var(--color-accent)]" />
                <p className="font-bold text-sm">Cette semaine</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sorties', value: stats?.runsThisWeek ?? 0 },
                  { label: 'Distance', value: `${(stats?.totalKmThisWeek ?? 0).toFixed(1)} km` },
                  { label: 'Meilleure allure', value: formatPace(stats?.bestPaceThisWeek ?? null) },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--color-surface-2)] rounded-xl p-3 text-center">
                    <p className="font-bold">{s.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Toutes les courses */}
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
              <p className="font-bold text-sm">Total</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Courses', value: stats?.allLogs.length ?? 0 },
                  {
                    label: 'Distance totale',
                    value: `${((stats?.allLogs ?? []).reduce((a, l) => a + (l.distance_m ?? 0), 0) / 1000).toFixed(0)} km`,
                  },
                  {
                    label: 'Temps total',
                    value: formatDuration(
                      (stats?.allLogs ?? []).reduce((a, l) => a + (l.duration_s ?? 0), 0)
                    ),
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-[var(--color-surface-2)] rounded-xl p-3 text-center">
                    <p className="font-bold">{s.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedLogId && (
        <LogDetail
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </div>
  )
}
