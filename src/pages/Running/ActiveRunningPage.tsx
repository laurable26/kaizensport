import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRunningStore } from '@/store/runningStore'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCompleteRunningLog, useCheckAndSavePR } from '@/hooks/useRunning'
import { Square, MapPin, Zap, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import RunMap from '@/components/running/RunMap'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatPace(secPerKm: number | null): string {
  if (!secPerKm || secPerKm <= 0 || secPerKm > 3600) return '--:--'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(2)} km`
}

function formatBlockRemaining(seconds: number): string {
  const s = Math.floor(Math.max(0, seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtDur(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

// ─── Barre de progression d'un bloc fractionné ────────────────────────────────

function IntervalBlock() {
  const { blocks, currentBlockIndex, blockSecondsRemaining, phase, sessionType } = useRunningStore()

  if (blocks.length === 0) return null
  // Afficher le bloc pour les sessions interval ET pour les sessions avec warmup/cooldown
  if (sessionType !== 'interval' && phase !== 'warmup' && phase !== 'cooldown') return null

  const currentBlock = blocks[currentBlockIndex]
  if (!currentBlock) return null

  const isComplete = phase === 'complete'
  const progress = isComplete
    ? 1
    : 1 - blockSecondsRemaining / currentBlock.duration_s

  const isWork = currentBlock.phase === 'work'
  const color = isWork ? 'var(--color-accent)' : 'var(--color-accent)'
  const label = currentBlock.label ?? (isWork ? 'Travail' : 'Repos')

  const paceTarget = currentBlock.target_pace_min_km
    ? formatPace(Number(currentBlock.target_pace_min_km))
    : null

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="font-bold text-sm">{isComplete ? '✅ Terminé !' : label}</span>
          {paceTarget && !isComplete && (
            <span className="text-xs text-[var(--color-text-muted)]">@ {paceTarget}/km</span>
          )}
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-lg" style={{ color }}>
            {isComplete ? '0:00' : formatElapsed(blockSecondsRemaining)}
          </span>
          <p className="text-xs text-[var(--color-text-muted)]">
            {currentBlockIndex + 1}/{blocks.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${progress * 100}%`, background: color }}
        />
      </div>

      {/* Upcoming blocks */}
      {!isComplete && currentBlockIndex < blocks.length - 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {blocks.slice(currentBlockIndex + 1, currentBlockIndex + 4).map((b, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: b.phase === 'work' ? 'var(--color-accent)/15' : 'var(--color-accent)/15',
                color: b.phase === 'work' ? 'var(--color-accent)' : 'var(--color-accent)',
              }}
            >
              {b.label ?? (b.phase === 'work' ? '⚡' : '😮‍💨')} {b.duration_s}s
            </span>
          ))}
          {blocks.length - currentBlockIndex - 1 > 3 && (
            <span className="text-xs text-[var(--color-text-muted)] self-center">
              +{blocks.length - currentBlockIndex - 4} autres
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ActiveRunningPage() {
  const navigate = useNavigate()
  const completeLog = useCompleteRunningLog()
  const checkPR = useCheckAndSavePR()

  const {
    isActive,
    runLogId,
    sessionName,
    sessionType,
    elapsedSeconds,
    distanceM,
    elevationGainM,
    currentPaceSecPerKm,
    avgPaceSecPerKm,
    bestPaceSecPerKm,
    gpsPoints,
    phase,
    blocks,
    currentBlockIndex,
    blockSecondsRemaining,
    endRun,
    reset,
  } = useRunningStore()

  const [stopping, setStopping] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [feeling, setFeeling] = useState<number | null>(null)
  const [showEndModal, setShowEndModal] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // GPS actif pendant la course
  useGeolocation({ enabled: isActive })

  // Screen Wake Lock — empêche l'écran de se verrouiller
  useEffect(() => {
    if (!isActive) return
    if (!('wakeLock' in navigator)) return

    let released = false
    ;(navigator as any).wakeLock.request('screen').then((sentinel: WakeLockSentinel) => {
      if (!released) wakeLockRef.current = sentinel
    }).catch(() => { /* non supporté ou refusé */ })

    return () => {
      released = true
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [isActive])

  // Re-acquérir le WakeLock après déverrouillage écran
  useEffect(() => {
    if (!isActive || !('wakeLock' in navigator)) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        ;(navigator as any).wakeLock.request('screen')
          .then((s: WakeLockSentinel) => { wakeLockRef.current = s })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isActive])

  // Rediriger si aucune course active
  useEffect(() => {
    if (!isActive) navigate('/running', { replace: true })
  }, [isActive, navigate])

  if (!isActive) return null

  const isIntervalSession = sessionType === 'interval' && blocks.length > 0
  const currentBlock = blocks[currentBlockIndex] ?? null
  const nextBlock = blocks[currentBlockIndex + 1] ?? null

  const handleStop = () => setShowEndModal(true)

  const handleConfirmEnd = async () => {
    setStopping(true)
    try {
      const stats = endRun()

      if (runLogId) {
        await completeLog.mutateAsync({
          id: runLogId,
          distanceM: Math.round(stats.distanceM),
          durationS: stats.elapsedSeconds,
          avgPaceSecPerKm: stats.avgPaceSecPerKm,
          bestPaceSecPerKm: stats.bestPaceSecPerKm,
          elevationGainM: Math.round(stats.elevationGainM),
          gpsTrack: stats.gpsPoints,
          overallFeeling: feeling,
        })

        // Vérifier les records personnels
        if (stats.distanceM > 0 && runLogId) {
          const newPRs = await checkPR.mutateAsync({
            runningLogId: runLogId,
            distanceM: stats.distanceM,
            durationS: stats.elapsedSeconds,
          })
          if (newPRs.length > 0) {
            toast.success(`🏆 Nouveau record : ${newPRs.join(', ')} !`, { duration: 5000 })
          }
        }
      }

      // Félicitations vocales après la sauvegarde (endRun() a annulé la synthèse précédente)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance('Félicitations pour ce run !')
        utt.lang = 'fr-FR'
        utt.volume = 1.0
        window.speechSynthesis.speak(utt)
      }

      reset()
      navigate('/running/history', { replace: true })
    } catch {
      toast.error('Erreur lors de la sauvegarde')
      setStopping(false)
    }
  }

  const paceColor = (() => {
    // Compare allure courante vs allure cible du bloc (si fractionné)
    const blocks = useRunningStore.getState().blocks
    const idx = useRunningStore.getState().currentBlockIndex
    const target = blocks[idx]?.target_pace_min_km
    if (!target || !currentPaceSecPerKm) return 'var(--color-text)'
    const diff = currentPaceSecPerKm - Number(target)
    if (diff < -10) return 'var(--color-accent)'   // trop rapide
    if (diff > 15) return 'var(--color-danger)'      // trop lent
    return 'var(--color-accent)'
  })()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header compact */}
      <div
        className="glass border-b border-[var(--color-border)] px-4 flex items-center justify-between"
        style={{ paddingTop: 'var(--safe-area-top)', height: 'calc(var(--safe-area-top) + 56px)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="font-bold text-sm truncate max-w-[160px]">{sessionName}</span>
        </div>
        <button
          onClick={handleStop}
          className="flex items-center gap-2 bg-[var(--color-danger)]/15 text-[var(--color-danger)] px-3 py-2 rounded-xl font-semibold text-sm active-scale"
        >
          <Square size={14} fill="currentColor" />
          Arrêter
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

        {isIntervalSession ? (
          <>
            {/* Chrono total — petit, secondaire */}
            <div className="text-center">
              <p className="font-mono text-lg text-[var(--color-text-muted)]">
                {formatElapsed(elapsedSeconds)}
              </p>
            </div>

            {/* Hero fractionné — grand countdown centré */}
            {phase === 'complete' ? (
              <div className="flex flex-col items-center justify-center text-center space-y-3 py-10">
                <p className="text-5xl">✅</p>
                <p className="font-bold text-xl">Fractionné terminé !</p>
              </div>
            ) : currentBlock ? (
              <div className="flex flex-col items-center justify-center text-center space-y-3 py-8">
                <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wide">
                  Bloc {currentBlockIndex + 1} / {blocks.length}
                </p>
                <h2 className="text-4xl font-black tracking-tight">
                  {currentBlock.label ?? (currentBlock.phase === 'work' ? 'Travail' : 'Repos')}
                </h2>
                <p className="font-mono text-8xl font-black tracking-tighter text-[var(--color-accent)]">
                  {formatBlockRemaining(blockSecondsRemaining)}
                </p>
                {nextBlock && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Suivant : {nextBlock.label ?? (nextBlock.phase === 'work' ? 'Travail' : 'Repos')} — {fmtDur(nextBlock.duration_s)}
                  </p>
                )}
                {/* Stats compactes : distance + allure courante */}
                <div className="flex items-center justify-center gap-8 mt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{(distanceM / 1000).toFixed(2)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">km</p>
                  </div>
                  {currentPaceSecPerKm != null && currentPaceSecPerKm > 0 && currentPaceSecPerKm < 3600 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatPace(currentPaceSecPerKm)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">allure</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* Chrono principal */}
            <div className="text-center py-2">
              <p className="font-mono text-5xl font-bold tracking-tight text-[var(--color-text)]">
                {formatElapsed(elapsedSeconds)}
              </p>
            </div>

            {/* Stats principales — 3 colonnes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold">{formatDistance(distanceM)}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Distance</p>
              </div>
              <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: paceColor }}>
                  {formatPace(currentPaceSecPerKm)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Allure /km</p>
              </div>
              <div className="bg-[var(--color-surface)] rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold">{formatPace(avgPaceSecPerKm)}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Moy. /km</p>
              </div>
            </div>

            {/* Stats secondaires */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--color-surface)] rounded-2xl p-3 flex items-center gap-3">
                <Zap size={18} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">{formatPace(bestPaceSecPerKm)}/km</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Meilleure allure</p>
                </div>
              </div>
              <div className="bg-[var(--color-surface)] rounded-2xl p-3 flex items-center gap-3">
                <ChevronUp size={18} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">+{Math.round(elevationGainM)} m</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Dénivelé +</p>
                </div>
              </div>
            </div>

            {/* Bloc fractionné / warmup / cooldown */}
            <IntervalBlock />
          </>
        )}

        {/* Carte GPS */}
        <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden">
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 active-scale"
          >
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[var(--color-accent)]" />
              <span className="text-sm font-semibold">Tracé GPS</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                ({gpsPoints.length} points)
              </span>
            </div>
            {mapExpanded
              ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
              : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
            }
          </button>
          {mapExpanded && (
            <div className="mx-4 mb-4">
              <RunMap points={gpsPoints} height={192} />
            </div>
          )}
        </div>

        {/* Avertissement GPS PWA */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-xs text-yellow-600 dark:text-yellow-400">
          ⚠️ Garde l&apos;écran allumé pour maintenir le GPS actif
        </div>
      </div>

      {/* Modal de fin de course */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setShowEndModal(false)}>
          <div
            className="bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm space-y-5"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
          >
            <div className="text-center">
              <p className="text-2xl mb-1">🏁</p>
              <h2 className="font-bold text-lg">Terminer la course ?</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {formatElapsed(elapsedSeconds)} · {formatDistance(distanceM)}
              </p>
            </div>

            {/* Ressenti */}
            <div>
              <p className="text-sm font-semibold mb-3 text-center">Comment tu te sens ?</p>
              <div className="flex justify-center gap-3">
                {[
                  { v: 1, emoji: '😩' },
                  { v: 2, emoji: '😕' },
                  { v: 3, emoji: '😐' },
                  { v: 4, emoji: '😊' },
                  { v: 5, emoji: '🔥' },
                ].map(({ v, emoji }) => (
                  <button
                    key={v}
                    onClick={() => setFeeling(feeling === v ? null : v)}
                    className={`w-12 h-12 rounded-2xl text-2xl transition-all active-scale ${
                      feeling === v
                        ? 'bg-[var(--color-accent)] scale-110'
                        : 'bg-[var(--color-surface-2)]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-3 rounded-xl bg-[var(--color-surface-2)] font-semibold text-sm active-scale"
              >
                Continuer
              </button>
              <button
                onClick={handleConfirmEnd}
                disabled={stopping}
                className="flex-1 py-3 rounded-xl bg-[var(--color-danger)] text-white font-bold text-sm active-scale disabled:opacity-60"
              >
                {stopping ? 'Sauvegarde...' : 'Terminer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
