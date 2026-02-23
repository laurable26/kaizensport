import { useSessionLogs, useSessionLogDetail } from '@/hooks/useSessionLog'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { format, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FEELING_EMOJIS } from '@/lib/constants'
import { ChevronRight, Clock, Dumbbell, Weight } from 'lucide-react'

// ── Détail d'un log ────────────────────────────────────────────────────────────
function HistoryDetailPage({ id }: { id: string }) {
  const { data: log, isLoading } = useSessionLogDetail(id)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Séance" back="/history" />
        <div className="px-4 py-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!log) return (
    <div>
      <PageHeader title="Séance" back="/history" />
      <p className="text-center py-12 text-[var(--color-text-muted)]">Séance introuvable</p>
    </div>
  )

  const sessionName = (log.sessions as { name: string } | null)?.name ?? 'Séance libre'
  const duration = log.completed_at
    ? differenceInMinutes(new Date(log.completed_at), new Date(log.started_at))
    : null

  // Grouper les set_logs par exercice
  type SetLog = { id: string; set_number: number; weight: number | null; reps: number | null; feeling: number | null; exercise: { name: string; muscle_group: string | null } }
  const setLogs = (log.set_logs ?? []) as SetLog[]
  const exerciseMap = new Map<string, { name: string; sets: SetLog[] }>()
  for (const s of setLogs) {
    const key = s.exercise.name
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, { name: key, sets: [] })
    }
    exerciseMap.get(key)!.sets.push(s)
  }
  const exercises = [...exerciseMap.values()]

  const totalSets = setLogs.length
  const totalVolume = setLogs.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0)

  return (
    <div>
      <PageHeader title={sessionName} back="/history" />

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Résumé */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base">{sessionName}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {format(new Date(log.started_at), "EEEE d MMMM · HH:mm", { locale: fr })}
              </p>
            </div>
            {log.overall_feeling && (
              <span className="text-3xl">
                {FEELING_EMOJIS[log.overall_feeling as keyof typeof FEELING_EMOJIS]}
              </span>
            )}
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-border)]">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-1">
                <Clock size={12} />
              </div>
              <p className="font-bold text-sm">{duration ? `${duration} min` : '—'}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Durée</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-1">
                <Dumbbell size={12} />
              </div>
              <p className="font-bold text-sm">{totalSets}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Séries</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-1">
                <Weight size={12} />
              </div>
              <p className="font-bold text-sm">
                {totalVolume > 0 ? `${Math.round(totalVolume)} kg` : '—'}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Volume</p>
            </div>
          </div>

          {log.notes && (
            <p className="text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2 italic">
              {log.notes}
            </p>
          )}
        </div>

        {/* Exercices */}
        {exercises.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-text-muted)] py-4">
            Aucune série enregistrée
          </p>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              {exercises.length} exercice{exercises.length !== 1 ? 's' : ''}
            </h2>
            {exercises.map((ex) => (
              <div key={ex.name} className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-2">
                <p className="font-semibold">{ex.name}</p>
                <div className="space-y-1.5">
                  {ex.sets.sort((a, b) => a.set_number - b.set_number).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-text-muted)] text-xs w-14">
                        Série {s.set_number}
                      </span>
                      <span className="font-medium flex-1">
                        {s.weight != null ? `${s.weight} kg` : '—'}
                        {s.reps != null ? ` × ${s.reps}` : ''}
                      </span>
                      {s.feeling && (
                        <span className="text-base">
                          {FEELING_EMOJIS[s.feeling as keyof typeof FEELING_EMOJIS]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refaire cette séance */}
        {log.session_id && (
          <button
            onClick={() => navigate(`/sessions/${log.session_id}`)}
            className="w-full bg-[var(--color-surface)] rounded-2xl p-4 flex items-center justify-between active-scale"
          >
            <span className="text-sm font-semibold">Refaire cette séance</span>
            <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Liste des logs ─────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { id } = useParams<{ id?: string }>()
  const { data: logs = [], isLoading } = useSessionLogs()
  const navigate = useNavigate()

  // Si un id est dans l'URL, afficher le détail
  if (id) return <HistoryDetailPage id={id} />

  return (
    <div>
      <PageHeader title="Historique" />

      <div className="px-4 py-4 space-y-2 pb-24">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-muted)] text-sm space-y-2">
            <Dumbbell size={40} className="mx-auto opacity-30" />
            <p>Aucune séance enregistrée</p>
            <p className="text-xs">Démarre une séance pour la voir apparaître ici</p>
          </div>
        ) : (
          logs.map((log) => {
            const duration = log.completed_at
              ? differenceInMinutes(new Date(log.completed_at), new Date(log.started_at))
              : null

            return (
              <button
                key={log.id}
                onClick={() => navigate(`/history/${log.id}`)}
                className="w-full bg-[var(--color-surface)] rounded-2xl p-4 text-left flex items-center gap-3 active-scale"
              >
                <div className={`w-1.5 h-full min-h-[2.5rem] rounded-full flex-shrink-0 ${
                  log.completed_at ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {(log.sessions as { name: string } | null)?.name ?? 'Séance libre'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(new Date(log.started_at), "EEEE d MMM · HH:mm", { locale: fr })}
                    {duration ? ` · ${duration} min` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {log.overall_feeling && (
                    <span className="text-lg">
                      {FEELING_EMOJIS[log.overall_feeling as keyof typeof FEELING_EMOJIS]}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
