import { format, startOfWeek, differenceInMinutes, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { useSessionLogs } from '@/hooks/useSessionLog'
import { useWeekSchedule } from '@/hooks/useSchedule'
import { useRunningStats, useRunningLogs, useStartRunningLog } from '@/hooks/useRunning'
import { useRunningStore } from '@/store/runningStore'
import { useAvatarUrl } from '@/hooks/useAvatarUrl'
import { useNavigate } from 'react-router-dom'
import { Play, Calendar, Dumbbell, User, Footprints, TrendingUp } from 'lucide-react'

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

function formatDistance(metres: number | null | undefined): string {
  if (!metres) return '--'
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(2)} km`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: logs = [] } = useSessionLogs()
  const { data: runningLogs = [] } = useRunningLogs(5)
  const { data: runningStats } = useRunningStats()
  const today = new Date()
  const { data: weekDays = [] } = useWeekSchedule(today)
  const navigate = useNavigate()
  const { isActive } = useRunningStore()
  const startRunningLog = useStartRunningLog()
  const startRun = useRunningStore((s) => s.startRun)

  const todayStr = format(today, 'yyyy-MM-dd')
  const todayEvents = weekDays.find((d) => format(d.date, 'yyyy-MM-dd') === todayStr)?.events ?? []

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  weekStart.setHours(0, 0, 0, 0)

  const completedLogs = logs.filter((l) => l.completed_at)
  const logsThisWeek = completedLogs.filter((l) => new Date(l.started_at) >= weekStart)
  const completedThisWeek = logsThisWeek.length

  const timeThisWeekMin = logsThisWeek.reduce((acc, l) => {
    if (!l.completed_at) return acc
    return acc + differenceInMinutes(new Date(l.completed_at), new Date(l.started_at))
  }, 0)

  const totalTimeMin = completedLogs.reduce((acc, l) => {
    if (!l.completed_at) return acc
    return acc + differenceInMinutes(new Date(l.completed_at), new Date(l.started_at))
  }, 0)

  const avatarUrl = useAvatarUrl(user?.user_metadata?.avatar_url)

  const displayName = user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? user?.email?.split('@')[0]
    ?? ''

  // Fusionner session_logs + running_logs pour la section "Récent"
  type RecentItem = {
    id: string
    type: 'muscu' | 'running'
    name: string
    startedAt: string
    durationMin?: number
    distanceM?: number
    feeling?: number | null
  }

  const recentMuscu: RecentItem[] = completedLogs.slice(0, 5).map((log) => ({
    id: log.id,
    type: 'muscu',
    name: (log.sessions as { name: string } | null)?.name ?? 'Séance libre',
    startedAt: log.started_at,
    durationMin: log.completed_at
      ? differenceInMinutes(new Date(log.completed_at), new Date(log.started_at))
      : undefined,
    feeling: log.overall_feeling,
  }))

  const recentRunning: RecentItem[] = runningLogs.filter((l) => l.completed_at).slice(0, 5).map((log) => ({
    id: log.id,
    type: 'running',
    name: (log.running_sessions as { name: string } | null)?.name ?? 'Course libre',
    startedAt: log.started_at,
    durationMin: log.duration_s ? Math.round(log.duration_s / 60) : undefined,
    distanceM: log.distance_m ?? undefined,
    feeling: log.overall_feeling,
  }))

  const recentAll = [...recentMuscu, ...recentRunning]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)

  const handleFreeRun = async () => {
    try {
      const sessionName = `Course libre — ${format(new Date(), 'd MMMM yyyy', { locale: fr })}`
      const log = await startRunningLog.mutateAsync(null)
      startRun({ runLogId: log.id, runningSessionId: null, sessionName, sessionType: 'free', blocks: [] })
      navigate('/running/active')
    } catch { /* silently ignore */ }
  }

  return (
    <div className="px-4 py-6 space-y-6" style={{ paddingTop: 'calc(var(--safe-area-top) + 1.5rem)' }}>
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[var(--color-text-muted)] text-sm capitalize">
            {format(today, "EEEE d MMMM", { locale: fr })}
          </p>
          <h1 className="text-2xl font-black mt-0.5">Bonjour {displayName}</h1>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center active-scale flex-shrink-0 mt-1 overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
          ) : (
            <User size={18} className="text-[var(--color-text-muted)]" />
          )}
        </button>
      </div>

      {/* Banner course active */}
      {isActive && (
        <button
          onClick={() => navigate('/running/active')}
          className="w-full bg-[var(--color-accent)] text-white rounded-2xl p-4 flex items-center gap-3 active-scale"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="font-bold flex-1 text-left">Course en cours</span>
          <span className="text-sm opacity-80">Reprendre →</span>
        </button>
      )}

      {/* Stats muscu */}
      <div className="space-y-2">
        <h2 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
          <Dumbbell size={12} />
          Musculation
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-2xl font-black text-[var(--color-accent)]">{completedThisWeek}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Cette semaine</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-lg font-black text-[var(--color-accent)] leading-tight">
              {totalTimeMin > 0 ? formatMinutes(totalTimeMin) : '—'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Temps total</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-2xl p-4">
            <p className="text-lg font-black text-[var(--color-accent)] leading-tight">
              {timeThisWeekMin > 0 ? formatMinutes(timeThisWeekMin) : '—'}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">Temps semaine</p>
          </div>
        </div>
      </div>

      {/* Stats course */}
      {(runningStats?.runsThisWeek ?? 0) > 0 || (runningStats?.allLogs.length ?? 0) > 0 ? (
        <div className="space-y-2">
          <h2 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <Footprints size={12} />
            Course
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-orange-500">{runningStats?.runsThisWeek ?? 0}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Sorties</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
              <p className="text-xl font-black text-orange-500">
                {(runningStats?.totalKmThisWeek ?? 0).toFixed(1)} km
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Distance</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
              <p className="text-lg font-black">{formatPace(runningStats?.bestPaceThisWeek)}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Allure</p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleFreeRun}
          disabled={startRunningLog.isPending}
          className="w-full bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3 active-scale disabled:opacity-60"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <Footprints size={20} className="text-orange-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Lancer une course libre</p>
            <p className="text-xs text-[var(--color-text-muted)]">Pas encore de sortie cette semaine</p>
          </div>
          <Play size={16} className="text-orange-500" />
        </button>
      )}

      {/* Aujourd'hui */}
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
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                event.type === 'running' ? 'bg-orange-500/20' : 'bg-[var(--color-accent)]/20'
              }`}>
                {event.type === 'running'
                  ? <Footprints size={22} className="text-orange-500" />
                  : <Dumbbell size={22} className="text-[var(--color-accent)]" />
                }
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
              {event.type === 'running' && event.runningSessionId && (
                <button
                  onClick={() => navigate(`/running/${event.runningSessionId}`)}
                  className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center active-scale flex-shrink-0"
                >
                  <Play size={16} className="text-white ml-0.5" />
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {/* Récent — muscu + course fusionnés */}
      {recentAll.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
            Récent
          </h2>
          <div className="space-y-2">
            {recentAll.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => item.type === 'running'
                  ? navigate('/running/history', { state: { openLogId: item.id } })
                  : navigate(`/history/${item.id}`)
                }
                className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3 active-scale cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.type === 'running' ? 'bg-orange-500' : 'bg-[var(--color-accent)]'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(parseISO(item.startedAt), "d MMM · HH:mm", { locale: fr })}
                    {item.type === 'running' && item.distanceM
                      ? ` · ${formatDistance(item.distanceM)}`
                      : item.durationMin
                      ? ` · ${item.durationMin} min`
                      : ''
                    }
                  </p>
                </div>
                {item.feeling && (
                  <span className="text-xl">
                    {item.feeling === 5 ? '💪' : item.feeling === 4 ? '😊' : item.feeling === 3 ? '😐' : item.feeling === 2 ? '😤' : '😓'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/history')}
              className="flex-1 text-center text-[var(--color-text-muted)] text-sm py-2"
            >
              <TrendingUp size={12} className="inline mr-1" />
              Historique muscu
            </button>
            <button
              onClick={() => navigate('/running/history')}
              className="flex-1 text-center text-[var(--color-text-muted)] text-sm py-2"
            >
              <Footprints size={12} className="inline mr-1" />
              Historique course
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
