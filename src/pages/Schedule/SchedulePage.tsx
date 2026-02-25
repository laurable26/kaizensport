import { useState } from 'react'
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Edit2, Footprints } from 'lucide-react'
import { useWeekSchedule, useScheduleEvent, useDeleteScheduledEvent, useUpdateScheduledEvent } from '@/hooks/useSchedule'
import { useSessions } from '@/hooks/useSessions'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useRunningSessions } from '@/hooks/useRunning'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import type { WeekDay } from '@/types/app'
import toast from 'react-hot-toast'

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'))
  const [showAddModal, setShowAddModal] = useState(false)
  // Heure choisie dans le modal
  const [pickedTime, setPickedTime] = useState<string>('')
  // Session/workout/running en attente de confirmation avec heure
  const [pendingItem, setPendingItem] = useState<{ type: 'session' | 'workout' | 'running'; id: string; name: string } | null>(null)

  // État pour modifier l'heure d'un event existant
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState<string>('')

  const { data: weekDays = [], isLoading } = useWeekSchedule(weekStart)
  const { data: sessions = [] } = useSessions()
  const { data: workouts = [] } = useWorkouts()
  const { data: runningSessions = [] } = useRunningSessions()
  const scheduleEvent = useScheduleEvent()
  const deleteEvent = useDeleteScheduledEvent()
  const updateEvent = useUpdateScheduledEvent()
  const navigate = useNavigate()

  const today = format(new Date(), 'yyyy-MM-dd')

  const handleSchedule = async (type: 'session' | 'workout' | 'running', id: string, time?: string) => {
    if (!selectedDate) return
    try {
      await scheduleEvent.mutateAsync({
        sessionId: type === 'session' ? id : undefined,
        workoutId: type === 'workout' ? id : undefined,
        runningSessionId: type === 'running' ? id : undefined,
        plannedDate: selectedDate,
        plannedTime: time || undefined,
      })
      // Programmer une notification locale si une heure est définie
      if (time) {
        const name = type === 'session'
          ? sessions.find((s) => s.id === id)?.name ?? 'Séance'
          : type === 'workout'
          ? workouts.find((w) => w.id === id)?.name ?? 'Workout'
          : runningSessions.find((r) => r.id === id)?.name ?? 'Course'
        scheduleLocalNotification(selectedDate, time, name)
      }
      toast.success('Planifié !')
      setShowAddModal(false)
      setPendingItem(null)
      setPickedTime('')
    } catch {
      toast.error('Erreur de planification')
    }
  }

  const handleSelectItem = (type: 'session' | 'workout' | 'running', id: string, name: string) => {
    setPendingItem({ type, id, name })
    setPickedTime('')
  }

  const handleConfirmItem = () => {
    if (!pendingItem) return
    handleSchedule(pendingItem.type, pendingItem.id, pickedTime || undefined)
  }

  const selectedDay = weekDays.find((d) => format(d.date, 'yyyy-MM-dd') === selectedDate)

  return (
    <div>
      <PageHeader title="Planning" />

      {/* Week navigation */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
        <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="p-2 active-scale">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(weekStart, "MMMM yyyy", { locale: fr })}
        </span>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="p-2 active-scale">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week strip — 7 colonnes égales sur toute la largeur */}
      <div className="px-4 py-3 grid grid-cols-7 gap-1.5">
        {isLoading
          ? [...Array(7)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--color-surface)] rounded-xl animate-pulse" />
            ))
          : weekDays.map((day: WeekDay) => {
              const dayStr = format(day.date, 'yyyy-MM-dd')
              const isSelected = selectedDate === dayStr
              const isToday = dayStr === today

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(isSelected ? null : dayStr)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors active-scale ${
                    isSelected
                      ? 'bg-[var(--color-accent)]'
                      : isToday
                      ? 'bg-[var(--color-accent)]/20'
                      : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <span className={`text-[10px] font-medium capitalize ${isSelected ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                    {format(day.date, 'EEEEE', { locale: fr })}
                  </span>
                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-[var(--color-text)]'}`}>
                    {format(day.date, 'd')}
                  </span>
                  {day.events.length > 0 ? (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--color-accent)]'}`} />
                  ) : (
                    <div className="w-1.5 h-1.5" />
                  )}
                </button>
              )
            })
        }
      </div>

      {/* Selected day content */}
      <div className="px-4 py-3 space-y-3 pb-32">
        {selectedDate ? (
          <>
            <h2 className="font-bold capitalize">
              {format(new Date(selectedDate + 'T12:00:00'), "EEEE d MMMM", { locale: fr })}
            </h2>

            {selectedDay?.events.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-muted)] text-sm flex flex-col items-center gap-3">
                <Calendar size={32} className="opacity-40" />
                Aucune séance planifiée ce jour
              </div>
            ) : (
              selectedDay?.events.map((event) => (
                <div key={event.id} className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      event.type === 'session' ? 'bg-[var(--color-accent)]'
                      : event.type === 'running' ? 'bg-orange-500'
                      : 'bg-[var(--color-success)]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{event.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {event.plannedTime ? (
                          <>
                            <Clock size={10} className="text-[var(--color-accent)]" />
                            <span className="text-xs text-[var(--color-accent)] font-medium">
                              {event.plannedTime.slice(0, 5)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">Pas d'heure fixée</span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)]">
                          · {event.type === 'session' ? 'Séance' : event.type === 'running' ? 'Course' : 'Workout'}
                        </span>
                      </div>
                      {/* Avatars des participants */}
                      {event.participants && event.participants.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex -space-x-1.5">
                            {event.participants.slice(0, 4).map((p) => (
                              <div
                                key={p.id}
                                className="w-5 h-5 rounded-full border-2 border-[var(--color-surface)] overflow-hidden bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0"
                                title={p.full_name ?? p.email}
                              >
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt={p.full_name ?? p.email} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] font-bold text-[var(--color-accent)] uppercase">
                                    {(p.full_name ?? p.email ?? '?')[0]}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            avec {event.participants.map((p) => p.full_name ?? p.email.split('@')[0]).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEventId(editingEventId === event.id ? null : event.id)
                          setEditingTime(event.plannedTime?.slice(0, 5) ?? '')
                        }}
                        className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center active-scale"
                      >
                        <Edit2 size={13} className="text-[var(--color-text-muted)]" />
                      </button>
                      {event.type === 'session' && event.sessionId && (
                        <button
                          onClick={() => navigate(`/sessions/${event.sessionId}`)}
                          className="text-xs text-[var(--color-accent)] font-semibold"
                        >
                          Ouvrir
                        </button>
                      )}
                      {event.type === 'running' && event.runningSessionId && (
                        <button
                          onClick={() => navigate(`/running/${event.runningSessionId}`)}
                          className="text-xs text-orange-500 font-semibold"
                        >
                          Ouvrir
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await deleteEvent.mutateAsync(event.id)
                          toast.success('Supprimé')
                        }}
                        className="text-xs text-[var(--color-danger)]"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {/* Inline edit time panel */}
                  {editingEventId === event.id && (
                    <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-2)] flex items-center gap-3">
                      <Clock size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                      <input
                        type="time"
                        value={editingTime}
                        onChange={(e) => setEditingTime(e.target.value)}
                        className="flex-1 bg-transparent text-[var(--color-text)] outline-none text-sm"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          try {
                            await updateEvent.mutateAsync({
                              id: event.id,
                              plannedTime: editingTime || null,
                            })
                            toast.success('Heure mise à jour')
                            setEditingEventId(null)
                          } catch {
                            toast.error('Erreur de mise à jour')
                          }
                        }}
                        disabled={updateEvent.isPending}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold active-scale disabled:opacity-50"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingEventId(null)}
                        className="text-xs text-[var(--color-text-muted)]"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          <div className="text-center py-10 text-[var(--color-text-muted)] text-sm flex flex-col items-center gap-2">
            <Calendar size={32} className="text-[var(--color-text-muted)]" />
            Sélectionner un jour pour voir le planning
          </div>
        )}
      </div>

      {/* Footer CTA when a day is selected */}
      {selectedDate && (
        <div className="footer-btn-container">
          <button
            onClick={() => { setShowAddModal(true); setPendingItem(null); setPickedTime('') }}
            className="w-full bg-[var(--color-accent)] text-white font-semibold py-4 rounded-xl active-scale neon transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Planifier une séance
          </button>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={() => { setShowAddModal(false); setPendingItem(null) }}>
          <div
            className="bg-[var(--color-surface)] rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto" />

            {pendingItem ? (
              /* ── Étape 2 : choisir l'heure ── */
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base">{pendingItem.name}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {selectedDate && format(new Date(selectedDate + 'T12:00:00'), "EEEE d MMMM", { locale: fr })}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                    <Clock size={12} />
                    Heure (optionnel)
                  </label>
                  <input
                    type="time"
                    value={pickedTime}
                    onChange={(e) => setPickedTime(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] text-base"
                  />
                  {pickedTime && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      🔔 Une notification de rappel sera envoyée à {pickedTime} (si les notifications sont activées)
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingItem(null)}
                    className="flex-1 py-3 rounded-xl bg-[var(--color-surface-2)] text-sm font-semibold"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleConfirmItem}
                    disabled={scheduleEvent.isPending}
                    className="flex-1 py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold neon disabled:opacity-50"
                  >
                    {scheduleEvent.isPending ? 'Planification...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Étape 1 : choisir la séance ── */
              <>
                <h3 className="font-bold text-base">
                  Planifier pour le {selectedDate && format(new Date(selectedDate + 'T12:00:00'), "d MMMM", { locale: fr })}
                </h3>

                {sessions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Séances</p>
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectItem('session', s.id, s.name)}
                        className="w-full text-left bg-[var(--color-surface-2)] rounded-xl px-4 py-3 active-scale flex items-center justify-between"
                      >
                        <span>{s.name}</span>
                        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                      </button>
                    ))}
                  </div>
                )}

                {workouts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Workouts</p>
                    {workouts.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => handleSelectItem('workout', w.id, w.name)}
                        className="w-full text-left bg-[var(--color-surface-2)] rounded-xl px-4 py-3 active-scale flex items-center justify-between"
                      >
                        <span>{w.name}</span>
                        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                      </button>
                    ))}
                  </div>
                )}

                {runningSessions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                      <Footprints size={11} />
                      Course
                    </p>
                    {runningSessions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectItem('running', r.id, r.name)}
                        className="w-full text-left bg-[var(--color-surface-2)] rounded-xl px-4 py-3 active-scale flex items-center justify-between"
                      >
                        <span>{r.name}</span>
                        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                      </button>
                    ))}
                  </div>
                )}

                {sessions.length === 0 && workouts.length === 0 && runningSessions.length === 0 && (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                    Créez d'abord des séances ou workouts
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notification locale (rappel 15 min avant) ─────────────────────────────────
function scheduleLocalNotification(date: string, time: string, name: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const notifDate = new Date(date + 'T' + time)
  // Rappel 15 min avant
  notifDate.setMinutes(notifDate.getMinutes() - 15)

  const delay = notifDate.getTime() - Date.now()
  if (delay <= 0) return

  setTimeout(() => {
    new Notification('Kaizen Sport 💪', {
      body: `${name} dans 15 minutes !`,
      icon: '/icons/logo.svg',
      badge: '/icons/logo.svg',
    })
  }, delay)
}
