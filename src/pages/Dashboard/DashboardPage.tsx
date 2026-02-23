import { format, startOfWeek, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { useSessionLogs } from '@/hooks/useSessionLog'
import { useWeekSchedule, useSkippedSessions } from '@/hooks/useSchedule'
import { useRunningStats, useRunningPRs } from '@/hooks/useRunning'
import { useRunningStore } from '@/store/runningStore'
import { useAppModeStore } from '@/store/appModeStore'
import { useNavigate } from 'react-router-dom'
import { Play, Calendar, Dumbbell, User, Footprints, Trophy, TrendingUp, MapPin } from 'lucide-react'

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm) return '--:--'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function RunningDashboard({ displayName }: { displayName: string }) {
  const navigate = useNavigate()
  const today = new Date()
  const { data: stats } = useRunningStats()
  const { data: prs = [] } = useRunningPRs()
  const { isActive } = useRunningStore()

  const PR_LABEL_MAP: Record<string, string> = { '5k': '5 km', '10k': '10 km', 'semi': 'Semi', 'marathon': 'Marathon' }
  const bestPR = prs.reduce<{ label: string; time: string } | null>((acc, pr) => {
    if (!acc) {
      const label = PR_LABEL_MAP[pr.distance] ?? pr.distance
      const m = Math.floor(pr.duration_s / 60)
      const s = pr.duration_s % 60
      return { label, time: `${m}'${String(s).padStart(2, '0')}` }
    }
    return acc
  }, null)

  return (
    <div className="px-4 py-6 space-y-6" style={{ paddingTop: 'calc(var(--safe-area-top) + 1.5rem)' }}>
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[var(--color-text-muted)] text-sm capitalize">
            {format(today, "EEEE d MMMM", { locale: fr })}
          </p>
          <h1 className="text-2xl font-black mt-0.5">Bonjour {displayName} 🏃</h1>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center active-scale flex-shrink-0 mt-1"
        >
          <User size={18} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Banner course active */}
      {isActive && (
        <button
          onClick={() => navigate('/running/active')}
          className="w-full bg-[var(--color-success)] text-white rounded-2xl p-4 flex items-center gap-3 active-scale"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="font-bold flex-1 text-left">Course en cours</span>
          <span className="text-sm opacity-80">Reprendre →</span>
        </button>
      )}

      {/* Stats semaine */}
      <div className="space-y-2">
        <h2 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Cette semaine</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[var(--color-success)]">{stats?.runsThisWeek ?? 0}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Sorties</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
            <p className="text-xl font-black text-[var(--color-accent)]">
              {(stats?.totalKmThisWeek ?? 0).toFixed(1)} km
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Distance</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
            <p className="text-lg font-black">{formatPace(stats?.bestPaceThisWeek)}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Meilleure allure</p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/running')}
          className="bg-[var(--color-success)] text-white rounded-2xl p-4 flex flex-col gap-2 active-scale"
        >
          <Footprints size={24} />
          <span className="font-bold text-sm">Lancer une course</span>
        </button>
        <button
          onClick={() => navigate('/running/history')}
          className="bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col gap-2 active-scale"
        >
          <TrendingUp size={24} className="text-[var(--color-accent)]" />
          <span className="font-bold text-sm">Mon historique</span>
        </button>
      </div>

      {/* Records personnels */}
      {prs.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">Records personnels</h2>
          <div className="space-y-2">
            {prs.slice(0, 3).map((pr) => {
              const label = PR_LABEL_MAP[pr.distance] ?? pr.distance
              const m = Math.floor(pr.duration_s / 60)
              const s = pr.duration_s % 60
              return (
                <div key={pr.distance} className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3">
                  <Trophy size={18} className="text-yellow-500 flex-shrink-0" />
                  <span className="flex-1 font-medium text-sm">{label}</span>
                  <span className="font-bold text-yellow-500">{m}'{String(s).padStart(2, '0')}</span>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => navigate('/running/history')}
            className="w-full text-center text-[var(--color-text-muted)] text-sm py-2"
          >
            Voir tous les records
          </button>
        </section>
      )}

      {/* Suggestion si pas de courses */}
      {(stats?.allLogs.length ?? 0) === 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-6 text-center space-y-3">
          <MapPin size={40} className="mx-auto text-[var(--color-success)] opacity-60" />
          <p className="font-semibold">Pas encore de course enregistrée</p>
          <p className="text-sm text-[var(--color-text-muted)]">Lance ta première sortie pour voir tes stats ici</p>
          <button
            onClick={() => navigate('/running')}
            className="bg-[var(--color-success)] text-white font-bold px-6 py-3 rounded-xl active-scale"
          >
            C'est parti ! 🏃
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: logs = [] } = useSessionLogs()
  const today = new Date()
  const { data: weekDays = [] } = useWeekSchedule(today)
  const { data: skippedCount = 0 } = useSkippedSessions()
  const navigate = useNavigate()
  const mode = useAppModeStore((s) => s.mode)

  const todayStr = format(today, 'yyyy-MM-dd')
  const todayEvents = weekDays.find((d) => format(d.date, 'yyyy-MM-dd') === todayStr)?.events ?? []

  // Début de la semaine courante (lundi)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  weekStart.setHours(0, 0, 0, 0)

  const completedLogs = logs.filter((l) => l.completed_at)
  const logsThisWeek = completedLogs.filter((l) => new Date(l.started_at) >= weekStart)

  const completedThisWeek = logsThisWeek.length

  // Temps d'entraînement de cette semaine (en minutes)
  const timeThisWeekMin = logsThisWeek.reduce((acc, l) => {
    if (!l.completed_at) return acc
    return acc + differenceInMinutes(new Date(l.completed_at), new Date(l.started_at))
  }, 0)

  // Temps total d'entraînement (toutes séances complètes)
  const totalTimeMin = completedLogs.reduce((acc, l) => {
    if (!l.completed_at) return acc
    return acc + differenceInMinutes(new Date(l.completed_at), new Date(l.started_at))
  }, 0)

  // Temps manqué estimé : séances manquées × durée moyenne
  const avgSessionMin = completedLogs.length > 0
    ? Math.round(totalTimeMin / completedLogs.length)
    : 60 // 1h par défaut
  const missedTimeMin = skippedCount * avgSessionMin

  // Prénom : user_metadata.full_name, ou première partie de l'email
  const displayName = user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? user?.email?.split('@')[0]
    ?? ''

  // Mode course → dashboard dédié
  if (mode === 'running') {
    return <RunningDashboard displayName={displayName} />
  }

  return (
    <div className="px-4 py-6 space-y-6" style={{ paddingTop: 'calc(var(--safe-area-top) + 1.5rem)' }}>
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[var(--color-text-muted)] text-sm capitalize">
            {format(today, "EEEE d MMMM", { locale: fr })}
          </p>
          <h1 className="text-2xl font-black mt-0.5">
            Bonjour {displayName}
          </h1>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center active-scale flex-shrink-0 mt-1"
        >
          <User size={18} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Stats — séances + temps */}
      <div className="space-y-2">
        <h2 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Séances</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-2xl font-black text-[var(--color-accent)]">{completedThisWeek}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Cette semaine</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-2xl font-black text-[var(--color-success)]">{completedLogs.length}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Total réalisées</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className={`text-2xl font-black ${skippedCount > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
              {skippedCount}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Manquées</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-lg font-black text-[var(--color-accent)] leading-tight">
              {timeThisWeekMin > 0 ? formatMinutes(timeThisWeekMin) : '—'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Temps semaine</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-lg font-black text-[var(--color-success)] leading-tight">
              {totalTimeMin > 0 ? formatMinutes(totalTimeMin) : '—'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Temps total</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className={`text-lg font-black leading-tight ${missedTimeMin > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
              {missedTimeMin > 0 ? formatMinutes(missedTimeMin) : '—'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Temps manqué</p>
          </div>
        </div>
      </div>

      {/* Today's events */}
      <section className="space-y-3">
        <h2 className="font-bold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
          Aujourd'hui
        </h2>

        {todayEvents.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 text-center space-y-3">
            <p className="text-[var(--color-text-muted)] text-sm">Aucune séance planifiée</p>
            <button
              onClick={() => navigate('/schedule')}
              className="text-[var(--color-accent)] text-sm font-semibold flex items-center gap-1 mx-auto"
            >
              <Calendar size={14} />
              Planifier
            </button>
          </div>
        ) : (
          todayEvents.map((event) => (
            <div
              key={event.id}
              className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center">
                <Dumbbell size={22} className="text-[var(--color-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{event.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {event.plannedTime ? `À ${event.plannedTime.slice(0, 5)}` : 'Pas d\'heure fixée'}
                </p>
              </div>
              {event.type === 'session' && event.sessionId && (
                <button
                  onClick={() => navigate(`/sessions/${event.sessionId}`)}
                  className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center active-scale flex-shrink-0"
                >
                  <Play size={16} className="text-white ml-0.5" />
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {/* Recent history */}
      {logs.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
            Récent
          </h2>
          <div className="space-y-2">
            {logs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                onClick={() => navigate(`/history/${log.id}`)}
                className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3 active-scale cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--color-success)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">
                    {(log.sessions as { name: string } | null)?.name ?? 'Séance libre'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(new Date(log.started_at), "d MMM · HH:mm", { locale: fr })}
                    {log.completed_at && (
                      ` · ${differenceInMinutes(new Date(log.completed_at), new Date(log.started_at))} min`
                    )}
                  </p>
                </div>
                {log.overall_feeling && (
                  <span className="text-xl">
                    {log.overall_feeling === 5 ? '💪' : log.overall_feeling === 4 ? '😊' : log.overall_feeling === 3 ? '😐' : log.overall_feeling === 2 ? '😤' : '😓'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/history')}
            className="w-full text-center text-[var(--color-text-muted)] text-sm py-2"
          >
            Voir tout l'historique
          </button>
        </section>
      )}
    </div>
  )
}
