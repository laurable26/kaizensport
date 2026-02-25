import { useState } from 'react'
import { useSessions, estimateSessionDuration, useArchiveSession } from '@/hooks/useSessions'
import { useRunningSessions, useArchiveRunningSession } from '@/hooks/useRunning'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { Plus, Timer, Play, Dumbbell, Footprints, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type SessionToDelete = { id: string; name: string; kind: 'muscu' | 'running' }

export default function SessionsPage() {
  const { data: sessions = [], isLoading: loadingMuscu } = useSessions()
  const { data: runningSessions = [], isLoading: loadingRunning } = useRunningSessions()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<SessionToDelete | null>(null)
  const archiveSession = useArchiveSession()
  const archiveRunningSession = useArchiveRunningSession()

  const handleArchive = async () => {
    if (!sessionToDelete) return
    try {
      if (sessionToDelete.kind === 'muscu') {
        await archiveSession.mutateAsync(sessionToDelete.id)
      } else {
        await archiveRunningSession.mutateAsync(sessionToDelete.id)
      }
      toast.success('Séance supprimée')
      setSessionToDelete(null)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const isLoading = loadingMuscu || loadingRunning
  const hasAny = sessions.length > 0 || runningSessions.length > 0

  return (
    <div>
      <PageHeader
        title="Séances"
        action={
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center active-scale"
            >
              {showMenu
                ? <X size={18} className="text-white" />
                : <Plus size={20} className="text-white" />
              }
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 bg-[var(--color-surface)] rounded-2xl shadow-lg border border-[var(--color-border)] overflow-hidden z-10 w-48">
                <button
                  onClick={() => { setShowMenu(false); navigate('/sessions/new') }}
                  className="w-full flex items-center gap-3 px-4 py-3 active-scale hover:bg-[var(--color-surface-2)] text-left"
                >
                  <Dumbbell size={16} className="text-[var(--color-accent)] flex-shrink-0" />
                  <span className="text-sm font-medium">Séance muscu</span>
                </button>
                <div className="h-px bg-[var(--color-border)]" />
                <button
                  onClick={() => { setShowMenu(false); navigate('/running/new') }}
                  className="w-full flex items-center gap-3 px-4 py-3 active-scale hover:bg-[var(--color-surface-2)] text-left"
                >
                  <Footprints size={16} className="text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium">Séance course</span>
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
          ))
        ) : !hasAny ? (
          <div className="text-center py-16 space-y-3">
            <Timer size={48} className="mx-auto text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Aucune séance créée</p>
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={() => navigate('/sessions/new')}
                className="text-[var(--color-accent)] font-semibold text-sm"
              >
                Créer une séance muscu
              </button>
              <button
                onClick={() => navigate('/running/new')}
                className="text-orange-500 font-semibold text-sm"
              >
                Créer une séance course
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Section Musculation */}
            {sessions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5 px-1">
                  <Dumbbell size={11} />
                  Musculation
                </p>
                {sessions.map((session) => {
                  const exCount = session.session_exercises?.length ?? 0
                  const durationMin = exCount > 0 ? estimateSessionDuration(session.session_exercises) : null
                  return (
                    <div
                      key={session.id}
                      className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4"
                    >
                      <button
                        onClick={() => navigate(`/sessions/${session.id}`)}
                        className="flex-1 text-left active-scale"
                      >
                        <p className="font-semibold">{session.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {exCount > 0
                            ? `${exCount} exercice${exCount > 1 ? 's' : ''}${durationMin ? ` · ~${durationMin} min` : ''}`
                            : session.notes || 'Aucun exercice'}
                        </p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSessionToDelete({ id: session.id, name: session.name, kind: 'muscu' }) }}
                        className="p-2 text-[var(--color-text-muted)] hover:text-red-400 active-scale flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => navigate(`/sessions/${session.id}`)}
                        className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center active-scale flex-shrink-0"
                      >
                        <Play size={16} className="text-white ml-0.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Section Course */}
            {runningSessions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1.5 px-1">
                  <Footprints size={11} />
                  Course
                </p>
                {runningSessions.map((rs) => {
                  const typeLabel =
                    rs.type === 'interval' ? '⚡ Fractionné'
                    : rs.type === 'distance' ? `📍 ${rs.target_distance_m ? (rs.target_distance_m / 1000).toFixed(1) + ' km' : 'Distance'}`
                    : rs.type === 'duration' ? `⏱ ${rs.target_duration_s ? Math.round(rs.target_duration_s / 60) + ' min' : 'Durée'}`
                    : 'Libre'
                  return (
                    <div
                      key={rs.id}
                      className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-4"
                    >
                      <button
                        onClick={() => navigate(`/running/${rs.id}`)}
                        className="flex-1 text-left active-scale"
                      >
                        <p className="font-semibold">{rs.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{typeLabel}</p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSessionToDelete({ id: rs.id, name: rs.name, kind: 'running' }) }}
                        className="p-2 text-[var(--color-text-muted)] hover:text-red-400 active-scale flex-shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => navigate(`/running/${rs.id}`)}
                        className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center active-scale flex-shrink-0"
                      >
                        <Play size={16} className="text-white ml-0.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation suppression */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={() => setSessionToDelete(null)}>
          <div
            className="bg-[var(--color-surface)] rounded-t-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-base">Supprimer cette séance ?</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                « {sessionToDelete.name} » sera retirée de l'onglet Séances. L'historique et la planification sont conservés.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-[var(--color-surface-2)] font-semibold text-sm active-scale"
              >
                Annuler
              </button>
              <button
                onClick={handleArchive}
                disabled={archiveSession.isPending || archiveRunningSession.isPending}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm active-scale disabled:opacity-60"
              >
                {archiveSession.isPending || archiveRunningSession.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
