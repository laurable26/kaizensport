import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import {
  useFriends,
  usePendingRequests,
  useSearchProfile,
  useSendFriendRequest,
  useRespondFriendRequest,
  useRemoveFriend,
  useRunInvites,
  useRespondRunInvite,
  useInviteToRun,
  useFriendStats,
} from '@/hooks/useFriends'
import type { Profile } from '@/hooks/useFriends'
import {
  usePendingSharedSessions,
  useAcceptSharedSession,
  useDeclineSharedSession,
} from '@/hooks/useSharedSessions'
import {
  usePendingSharedRunningSessions,
  useAcceptSharedRunningSession,
  useDeclineSharedRunningSession,
} from '@/hooks/useSharedRunningSessions'
import { useAppModeStore } from '@/store/appModeStore'
import { useRunningStore } from '@/store/runningStore'
import { useAuth } from '@/hooks/useAuth'
import { UserPlus, UserCheck, UserX, Search, Users, Footprints, Share2, Copy, Check as CheckIcon, Dumbbell, Calendar, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Drawer de stats ami ───────────────────────────────────────────────────────

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
  return `${m} min`
}

function FriendStatsDrawer({ friend, onClose }: { friend: Profile; onClose: () => void }) {
  const { data: stats, isLoading } = useFriendStats(friend.id)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-t-3xl p-5 space-y-5 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto" />

        {/* Identité */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--color-accent)] font-bold text-lg uppercase">
              {(friend.full_name ?? friend.email ?? '?')[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{friend.full_name ?? friend.email}</p>
            {friend.full_name && (
              <p className="text-xs text-[var(--color-text-muted)] truncate">{friend.email}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)]">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-20 bg-[var(--color-surface-2)] rounded-2xl animate-pulse" />
            <div className="h-20 bg-[var(--color-surface-2)] rounded-2xl animate-pulse" />
          </div>
        ) : !stats ? (
          <p className="text-sm text-center text-[var(--color-text-muted)] py-4">
            Statistiques non disponibles
          </p>
        ) : (
          <div className="space-y-3">
            {/* Stats muscu */}
            <div className="bg-[var(--color-surface-2)] rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell size={16} className="text-[var(--color-accent)]" />
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Musculation</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)]">Cette semaine</span>
                <span className="font-bold">{stats.muscu.sessions_this_week ?? 0}</span>
              </div>
              {(stats.muscu.weekly_duration_s ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">Temps semaine</span>
                  <span className="font-semibold text-sm">
                    {formatDurationShort(stats.muscu.weekly_duration_s)}
                  </span>
                </div>
              )}
              {(stats.muscu.total_time_s ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">Temps total</span>
                  <span className="font-semibold text-sm">
                    {formatDurationShort(stats.muscu.total_time_s)}
                  </span>
                </div>
              )}
              {stats.muscu.last_session_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">Dernière séance</span>
                  <span className="font-semibold text-sm">
                    {format(new Date(stats.muscu.last_session_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>

            {/* Stats running */}
            <div className="bg-[var(--color-surface-2)] rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Footprints size={16} className="text-orange-500" />
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Course</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)]">Courses terminées</span>
                <span className="font-bold">{stats.running.total_runs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)]">Distance totale</span>
                <span className="font-bold">{formatDistance(stats.running.total_distance_m)}</span>
              </div>
              {stats.running.total_duration_s > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">Temps total</span>
                  <span className="font-semibold text-sm">{formatDurationShort(stats.running.total_duration_s)}</span>
                </div>
              )}
              {stats.running.last_run_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">Dernière course</span>
                  <span className="font-semibold text-sm">
                    {format(new Date(stats.running.last_run_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'add'>('friends')
  const [searchEmail, setSearchEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null)
  const navigate = useNavigate()
  const mode = useAppModeStore((s) => s.mode)
  const { isActive: isRunActive, runLogId } = useRunningStore()
  const { user } = useAuth()
  const senderName = user?.user_metadata?.full_name ?? user?.email ?? 'Un ami'

  const { data: friends = [] } = useFriends()
  const { data: pendingRequests = [] } = usePendingRequests()
  const { data: runInvites = [] } = useRunInvites()
  const { data: sharedSessionInvites = [] } = usePendingSharedSessions()
  const { data: sharedRunningInvites = [] } = usePendingSharedRunningSessions()
  const searchProfile = useSearchProfile()
  const sendRequest = useSendFriendRequest()
  const respondRequest = useRespondFriendRequest()
  const removeFriend = useRemoveFriend()
  const respondRunInvite = useRespondRunInvite()
  const inviteToRun = useInviteToRun()
  const acceptSharedSession = useAcceptSharedSession()
  const declineSharedSession = useDeclineSharedSession()
  const acceptSharedRunning = useAcceptSharedRunningSession()
  const declineSharedRunning = useDeclineSharedRunningSession()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchEmail.trim()) return
    await searchProfile.mutateAsync(searchEmail.trim())
  }

  const handleSendRequest = async (userId: string) => {
    try {
      await sendRequest.mutateAsync(userId)
      toast.success('Demande envoyée !')
      setSearchEmail('')
      searchProfile.reset()
    } catch {
      toast.error("Erreur lors de l'envoi")
    }
  }

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await respondRequest.mutateAsync({ id, accept })
      toast.success(accept ? 'Ami ajouté !' : 'Demande refusée')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Supprimer cet ami ?')) return
    try {
      await removeFriend.mutateAsync(id)
      toast.success('Ami supprimé')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleAcceptRunInvite = async (id: string) => {
    try {
      await respondRunInvite.mutateAsync({ id, accept: true })
      navigate('/running/history')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleAcceptSharedSession = async (invite: typeof sharedSessionInvites[number]) => {
    try {
      const newSessionId = await acceptSharedSession.mutateAsync(invite)
      toast.success('Séance ajoutée dans ton compte !')
      navigate(`/sessions/${newSessionId}`)
    } catch {
      toast.error('Erreur lors de l\'acceptation')
    }
  }

  return (
    <div>
      <PageHeader title="Amis" />

      {/* Bannière : invitations séances partagées */}
      {sharedSessionInvites.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          {sharedSessionInvites.map((invite) => {
            const inviterName = (invite.inviter as any)?.full_name ?? (invite.inviter as any)?.email ?? 'Quelqu\'un'
            const sessionName = (invite.source_session as any)?.name ?? 'une séance'
            const hasSuggestedDate = invite.suggested_date
            return (
              <div key={invite.id} className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={16} className="text-[var(--color-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      <span className="text-[var(--color-accent)]">{inviterName}</span> te partage <span className="text-[var(--color-text)]">« {sessionName} »</span>
                    </p>
                    {hasSuggestedDate && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                        <Calendar size={11} />
                        Suggéré le {format(new Date(invite.suggested_date!), 'd MMM', { locale: fr })}
                        {invite.suggested_time && ` à ${invite.suggested_time.slice(0, 5)}`}
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Les exercices seront copiés dans ton compte
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAcceptSharedSession(invite)}
                        disabled={acceptSharedSession.isPending}
                        className="flex-1 bg-[var(--color-accent)] text-white text-xs font-semibold py-2 rounded-lg active-scale disabled:opacity-60"
                      >
                        {acceptSharedSession.isPending ? 'Copie en cours...' : 'Accepter la séance'}
                      </button>
                      <button
                        onClick={() => declineSharedSession.mutateAsync(invite.id)}
                        className="flex-1 bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-semibold py-2 rounded-lg active-scale"
                      >
                        Ignorer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bannière : plans de course partagés */}
      {sharedRunningInvites.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          {sharedRunningInvites.map((invite) => {
            const inviterName = (invite.inviter as any)?.full_name ?? (invite.inviter as any)?.email ?? 'Quelqu\'un'
            const sessionName = (invite.source_session as any)?.name ?? 'un plan de course'
            const hasSuggestedDate = invite.suggested_date
            return (
              <div key={invite.id} className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Footprints size={16} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      <span className="text-orange-500">{inviterName}</span> te partage <span className="text-[var(--color-text)]">« {sessionName} »</span>
                    </p>
                    {hasSuggestedDate && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                        <Calendar size={11} />
                        Suggéré le {format(new Date(invite.suggested_date!), 'd MMM', { locale: fr })}
                        {invite.suggested_time && ` à ${invite.suggested_time.slice(0, 5)}`}
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Le plan sera copié dans ton compte
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          try {
                            const newId = await acceptSharedRunning.mutateAsync(invite)
                            toast.success('Plan ajouté dans ton compte !')
                            navigate(`/running/${newId}`)
                          } catch {
                            toast.error('Erreur lors de l\'acceptation')
                          }
                        }}
                        disabled={acceptSharedRunning.isPending}
                        className="flex-1 bg-orange-500 text-white text-xs font-semibold py-2 rounded-lg active-scale disabled:opacity-60"
                      >
                        {acceptSharedRunning.isPending ? 'Copie en cours...' : 'Accepter le plan'}
                      </button>
                      <button
                        onClick={() => declineSharedRunning.mutateAsync(invite.id)}
                        className="flex-1 bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-semibold py-2 rounded-lg active-scale"
                      >
                        Ignorer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bannière : invitations course */}
      {runInvites.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          {runInvites.map((invite) => (
            <div key={invite.id} className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Footprints size={18} className="text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {(invite.inviter as any)?.full_name ?? (invite.inviter as any)?.email ?? 'Quelqu\'un'} vous invite à suivre sa course
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAcceptRunInvite(invite.id)}
                      className="flex-1 bg-[var(--color-accent)] text-white text-xs font-semibold py-2 rounded-lg active-scale"
                    >
                      Voir la course
                    </button>
                    <button
                      onClick={() => respondRunInvite.mutateAsync({ id: invite.id, accept: false })}
                      className="flex-1 bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-semibold py-2 rounded-lg active-scale"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 p-1 bg-[var(--color-surface)] rounded-xl">
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'friends' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)]'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Users size={14} />
            Amis {friends.length > 0 && `(${friends.length})`}
          </span>
        </button>
        <button
          onClick={() => setTab('add')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors relative ${
            tab === 'add' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)]'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <UserPlus size={14} />
            Ajouter
            {pendingRequests.length > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-[var(--color-danger)] text-white text-[10px] rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </span>
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 pb-24">
        {tab === 'friends' ? (
          <>
            {friends.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Users size={40} className="mx-auto text-[var(--color-text-muted)] opacity-40" />
                <p className="text-[var(--color-text-muted)] text-sm">Aucun ami pour l'instant</p>
                <button
                  onClick={() => setTab('add')}
                  className="text-[var(--color-accent)] text-sm font-semibold"
                >
                  Ajouter un ami
                </button>
              </div>
            ) : (
              friends.map((f) => (
                <div
                  key={f.id}
                  className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3 active-scale cursor-pointer"
                  onClick={() => f.friend && setSelectedFriend(f.friend)}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--color-accent)] font-bold text-sm uppercase">
                      {(f.friend?.full_name ?? f.friend?.email ?? '?')[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{f.friend?.full_name ?? f.friend?.email}</p>
                    {f.friend?.full_name && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{f.friend.email}</p>
                    )}
                  </div>
                  {/* Inviter sur le run en cours */}
                  {mode === 'running' && isRunActive && runLogId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!f.friend?.id) return
                        inviteToRun.mutateAsync({ runLogId, inviteeId: f.friend.id })
                          .then(() => toast.success(`Invitation envoyée à ${f.friend?.full_name ?? f.friend?.email}`))
                          .catch(() => toast.error('Erreur'))
                      }}
                      disabled={inviteToRun.isPending}
                      className="p-2 text-[var(--color-accent)] active-scale"
                      title="Inviter sur ce run"
                    >
                      <Footprints size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(f.id) }}
                    className="p-2 text-[var(--color-text-muted)] active-scale"
                  >
                    <UserX size={16} />
                  </button>
                  <ChevronRight size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Demandes reçues
                </p>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--color-accent)] font-bold text-sm uppercase">
                        {(req.friend?.full_name ?? req.friend?.email ?? '?')[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{req.friend?.full_name ?? req.friend?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(req.id, true)}
                        className="w-9 h-9 rounded-xl bg-[var(--color-success)]/20 flex items-center justify-center active-scale"
                      >
                        <UserCheck size={16} className="text-[var(--color-success)]" />
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, false)}
                        className="w-9 h-9 rounded-xl bg-[var(--color-danger)]/20 flex items-center justify-center active-scale"
                      >
                        <UserX size={16} className="text-[var(--color-danger)]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Chercher par e-mail
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="ami@exemple.com"
                className="flex-1 bg-[var(--color-surface)] px-4 py-3 rounded-xl text-[var(--color-text)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] text-sm"
              />
              <button
                type="submit"
                disabled={searchProfile.isPending}
                className="w-12 h-12 bg-[var(--color-accent)] rounded-xl flex items-center justify-center active-scale flex-shrink-0"
              >
                <Search size={18} className="text-white" />
              </button>
            </form>

            {/* Résultat : profil non trouvé → invitation à rejoindre */}
            {searchProfile.data === null && searchProfile.isSuccess && (() => {
              const inviteText = `${senderName} t'invite à rejoindre Kaizen Sport, l'appli de suivi d'entraînement 💪\n\n👉 ${window.location.origin}`

              const handleShare = async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: 'Kaizen Sport',
                      text: inviteText,
                    })
                  } catch {
                    // Annulé par l'utilisateur
                  }
                } else {
                  await navigator.clipboard.writeText(inviteText)
                  setCopied(true)
                  toast.success('Texte copié !')
                  setTimeout(() => setCopied(false), 2500)
                }
              }

              return (
                <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                      <Share2 size={18} className="text-[var(--color-text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{searchEmail}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Pas encore sur Kaizen Sport</p>
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface-2)] rounded-xl px-3 py-2.5 text-xs text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">
                    {inviteText}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleShare}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white font-semibold py-3 rounded-xl active-scale text-sm"
                    >
                      <Share2 size={15} />
                      Partager
                    </button>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteText)
                        setCopied(true)
                        toast.success('Copié !')
                        setTimeout(() => setCopied(false), 2500)
                      }}
                      className={`w-12 flex items-center justify-center rounded-xl active-scale transition-colors ${
                        copied
                          ? 'bg-[var(--color-success)] text-white'
                          : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {copied ? <CheckIcon size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Résultat : profil trouvé */}
            {searchProfile.data && (
              <div className="bg-[var(--color-surface)] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--color-accent)] font-bold text-sm uppercase">
                    {(searchProfile.data.full_name ?? searchProfile.data.email)[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{searchProfile.data.full_name ?? searchProfile.data.email}</p>
                  {searchProfile.data.full_name && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{searchProfile.data.email}</p>
                  )}
                </div>
                <button
                  onClick={() => handleSendRequest(searchProfile.data!.id)}
                  disabled={sendRequest.isPending}
                  className="flex items-center gap-1.5 bg-[var(--color-accent)] text-white text-xs font-semibold px-3 py-2 rounded-lg active-scale"
                >
                  <UserPlus size={14} />
                  Ajouter
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedFriend && (
        <FriendStatsDrawer
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  )
}
