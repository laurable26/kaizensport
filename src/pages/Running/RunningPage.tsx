import { useNavigate } from 'react-router-dom'
import { useRunningSessions, useDeleteRunningSession } from '@/hooks/useRunning'
import PageHeader from '@/components/layout/PageHeader'
import { Plus, Footprints, ChevronRight, Trash2, Timer, MapPin, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import type { RunningSession } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  free: 'Libre',
  distance: 'Distance',
  duration: 'Durée',
  interval: 'Fractionné',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  free: <Footprints size={16} />,
  distance: <MapPin size={16} />,
  duration: <Timer size={16} />,
  interval: <Zap size={16} />,
}

function formatTarget(session: RunningSession): string {
  if (session.type === 'distance' && session.target_distance_m) {
    const km = session.target_distance_m / 1000
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`
  }
  if (session.type === 'duration' && session.target_duration_s) {
    const m = Math.floor(session.target_duration_s / 60)
    return `${m} min`
  }
  if (session.type === 'interval') {
    const parts: string[] = []
    if (session.warmup_duration_s) parts.push(`éch. ${Math.round(session.warmup_duration_s / 60)} min`)
    if (session.cooldown_duration_s) parts.push(`retour ${Math.round(session.cooldown_duration_s / 60)} min`)
    return parts.join(' · ') || 'Intervalles'
  }
  return 'Course libre'
}

export default function RunningPage() {
  const navigate = useNavigate()
  const { data: sessions = [], isLoading } = useRunningSessions()
  const deleteSession = useDeleteRunningSession()

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return
    try {
      await deleteSession.mutateAsync(id)
      toast.success('Plan supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div>
      <PageHeader title="Course à pied" />

      <div className="px-4 py-4 space-y-3">
        {/* Quick start */}
        <button
          onClick={() => navigate('/running/new')}
          className="w-full bg-[var(--color-success)] text-white font-bold py-4 rounded-2xl active-scale flex items-center justify-center gap-2 text-base"
        >
          <Footprints size={20} />
          Course libre
        </button>

        {/* Plans list */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="font-bold text-base">Mes plans</h2>
          <button
            onClick={() => navigate('/running/new')}
            className="flex items-center gap-1.5 text-[var(--color-accent)] text-sm font-semibold active-scale"
          >
            <Plus size={16} />
            Nouveau
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[var(--color-surface)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Footprints size={48} className="mx-auto text-[var(--color-text-muted)] opacity-40" />
            <p className="text-[var(--color-text-muted)] text-sm">Aucun plan de course</p>
            <button
              onClick={() => navigate('/running/new')}
              className="text-[var(--color-accent)] text-sm font-semibold active-scale"
            >
              Créer mon premier plan →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
                <button
                  onClick={() => navigate(`/running/${session.id}`)}
                  className="w-full flex items-center gap-4 px-4 py-4 active-scale text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    session.type === 'interval'
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                  }`}>
                    {TYPE_ICONS[session.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{session.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {TYPE_LABELS[session.type]} · {formatTarget(session)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
                </button>
                <div className="border-t border-[var(--color-border)] flex">
                  <button
                    onClick={() => navigate(`/running/${session.id}/edit`)}
                    className="flex-1 py-2.5 text-xs text-[var(--color-text-muted)] font-medium active-scale"
                  >
                    Modifier
                  </button>
                  <div className="w-px bg-[var(--color-border)]" />
                  <button
                    onClick={() => handleDelete(session.id, session.name)}
                    disabled={deleteSession.isPending}
                    className="px-4 py-2.5 active-scale text-[var(--color-danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
