import { format, startOfWeek, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { useSessionLogs } from '@/hooks/useSessionLog'
import { useWeekSchedule, useSkippedSessions } from '@/hooks/useSchedule'
import { useNavigate } from 'react-router-dom'
import { Play, Calendar, Dumbbell, User } from 'lucide-react'

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: logs = [] } = useSessionLogs()
  const today = new Date()
  const { data: weekDays = [] } = useWeekSchedule(today)
  const { data: skippedCount = 0 } = useSkippedSessions()
  const navigate = useNavigate()

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
