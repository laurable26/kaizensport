import { create } from 'zustand'
import type { ExpandedIntervalBlock, GpsPoint, LiveRunStats } from '@/types/app'
import type { RunningSession } from '@/types/database'

export type RunPhase = 'idle' | 'warmup' | 'interval' | 'cooldown' | 'free' | 'complete'

interface RunningStore {
  // Identité
  isActive: boolean
  runLogId: string | null            // ID du running_log en DB, stocké ici pendant la course
  runningSessionId: string | null
  sessionName: string
  sessionType: RunningSession['type']

  // Temps écoulé
  elapsedSeconds: number
  _startTime: number | null          // Date.now() au début pour un chrono précis
  _blockStartTime: number | null     // Date.now() au début de chaque bloc pour précision
  _intervalId: ReturnType<typeof setInterval> | null

  // GPS et statistiques
  gpsPoints: GpsPoint[]
  distanceM: number
  elevationGainM: number
  currentPaceSecPerKm: number | null
  avgPaceSecPerKm: number | null
  bestPaceSecPerKm: number | null

  // Fractionné (seulement pour les sessions de type 'interval')
  blocks: ExpandedIntervalBlock[]
  currentBlockIndex: number
  blockSecondsRemaining: number
  phase: RunPhase

  // Actions
  startRun: (params: {
    runLogId: string
    runningSessionId: string | null
    sessionName: string
    sessionType: RunningSession['type']
    blocks: ExpandedIntervalBlock[]
  }) => void
  addGpsPoint: (point: GpsPoint) => void
  _tick: () => void
  _advanceBlock: () => void
  endRun: () => LiveRunStats
  reset: () => void
}

const initialState = {
  isActive: false,
  runLogId: null,
  runningSessionId: null,
  sessionName: '',
  sessionType: 'free' as RunningSession['type'],
  elapsedSeconds: 0,
  _startTime: null as number | null,
  _blockStartTime: null as number | null,
  _intervalId: null,
  gpsPoints: [] as GpsPoint[],
  distanceM: 0,
  elevationGainM: 0,
  currentPaceSecPerKm: null as number | null,
  avgPaceSecPerKm: null as number | null,
  bestPaceSecPerKm: null as number | null,
  blocks: [] as ExpandedIntervalBlock[],
  currentBlockIndex: 0,
  blockSecondsRemaining: 0,
  phase: 'idle' as RunPhase,
}

export const useRunningStore = create<RunningStore>((set, get) => ({
  ...initialState,

  startRun: ({ runLogId, runningSessionId, sessionName, sessionType, blocks }) => {
    const firstBlock = blocks[0]
    const phase: RunPhase = blocks.length > 0
      ? (firstBlock.label === 'Échauffement' ? 'warmup' : 'interval')
      : 'free'

    const startTime = Date.now()
    const blockStartTime = Date.now()
    const intervalId = setInterval(() => get()._tick(), 500) // 500ms pour précision accrue

    // Vibration courte = début de course
    if (navigator.vibrate) navigator.vibrate(200)
    // Son grave = c'est parti
    playRunningBeep(330, 0.4)
    // Annonce vocale du premier bloc
    if (firstBlock) {
      setTimeout(() => speak(firstBlock.label ?? (firstBlock.phase === 'work' ? 'Travail' : 'Échauffement')), 600)
    } else {
      setTimeout(() => speak('Course libre'), 600)
    }

    set({
      isActive: true,
      runLogId,
      runningSessionId,
      sessionName,
      sessionType,
      blocks,
      currentBlockIndex: 0,
      blockSecondsRemaining: firstBlock?.duration_s ?? 0,
      phase,
      elapsedSeconds: 0,
      _startTime: startTime,
      _blockStartTime: blockStartTime,
      gpsPoints: [],
      distanceM: 0,
      elevationGainM: 0,
      currentPaceSecPerKm: null,
      avgPaceSecPerKm: null,
      bestPaceSecPerKm: null,
      _intervalId: intervalId,
    })
  },

  addGpsPoint: (point) => {
    set((state) => {
      const prev = state.gpsPoints[state.gpsPoints.length - 1]
      let addedDist = 0
      let addedEle = 0

      if (prev) {
        addedDist = haversineMetres(prev.lat, prev.lng, point.lat, point.lng)
        if (point.alt != null && prev.alt != null && point.alt > prev.alt) {
          addedEle = point.alt - prev.alt
        }
      }

      const newDistance = state.distanceM + addedDist
      const newElevation = state.elevationGainM + addedEle
      const newPoints = [...state.gpsPoints, point]

      // Allure courante : priorité à la vitesse GPS native si disponible
      let currentPace: number | null = null
      if (point.speed != null && point.speed > 0.5) {
        // speed est en m/s → sec/km = 1000 / speed
        currentPace = Math.round(1000 / point.speed)
      } else {
        currentPace = computeRollingPace(newPoints, 200)
      }

      // Allure moyenne = temps écoulé / distance totale
      const avgPace = newDistance > 0 && state.elapsedSeconds > 0
        ? Math.round(state.elapsedSeconds / (newDistance / 1000))
        : null

      // Meilleure allure (min = plus rapide)
      const best = currentPace != null
        ? (state.bestPaceSecPerKm != null
            ? Math.min(state.bestPaceSecPerKm, currentPace)
            : currentPace)
        : state.bestPaceSecPerKm

      return {
        gpsPoints: newPoints,
        distanceM: newDistance,
        elevationGainM: newElevation,
        currentPaceSecPerKm: currentPace,
        avgPaceSecPerKm: avgPace,
        bestPaceSecPerKm: best,
      }
    })
  },

  _tick: () => {
    const { _startTime, _blockStartTime, sessionType, blocks, currentBlockIndex } = get()

    // Chrono précis basé sur Date.now()
    if (_startTime !== null) {
      const newElapsed = Math.floor((Date.now() - _startTime) / 1000)
      set({ elapsedSeconds: newElapsed })
    }

    if ((sessionType === 'interval' || blocks.length > 0) && blocks.length > 0) {
      const currentBlock = blocks[currentBlockIndex]
      if (currentBlock && _blockStartTime !== null) {
        const elapsed = (Date.now() - _blockStartTime) / 1000
        const remaining = Math.max(0, currentBlock.duration_s - elapsed)
        set({ blockSecondsRemaining: remaining })
        if (remaining <= 0) {
          get()._advanceBlock()
        }
      }
    }
  },

  _advanceBlock: () => {
    const { blocks, currentBlockIndex } = get()
    const nextIndex = currentBlockIndex + 1

    if (nextIndex >= blocks.length) {
      // Tous les blocs terminés
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
      playDoubleRunningBeep()
      setTimeout(() => speak('Séance terminée'), 400)
      set({ phase: 'complete', currentBlockIndex: blocks.length - 1, blockSecondsRemaining: 0 })
    } else {
      const nextBlock = blocks[nextIndex]
      // Son selon le type du prochain bloc
      if (nextBlock.phase === 'work') {
        playRunningBeep(330, 0.4)  // grave = travail
      } else {
        playRunningBeep(660, 0.4)  // aigu = repos/warmup/cooldown
      }
      if (navigator.vibrate) navigator.vibrate(150)
      // Phase selon le label du bloc
      let phase: RunPhase = nextBlock.phase === 'work' ? 'interval' : 'interval'
      if (nextBlock.label === 'Échauffement') phase = 'warmup'
      else if (nextBlock.label === 'Retour au calme') phase = 'cooldown'
      else phase = nextBlock.phase === 'work' ? 'interval' : 'interval'
      // Annonce vocale
      setTimeout(() => speak(nextBlock.label ?? (nextBlock.phase === 'work' ? 'Travail' : 'Récupération')), 400)
      set({
        currentBlockIndex: nextIndex,
        blockSecondsRemaining: nextBlock.duration_s,
        _blockStartTime: Date.now(),
        phase,
      })
    }
  },

  endRun: () => {
    const state = get()
    const { _intervalId } = state
    if (_intervalId) clearInterval(_intervalId)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    const stats: LiveRunStats = {
      elapsedSeconds: state.elapsedSeconds,
      distanceM: state.distanceM,
      currentPaceSecPerKm: state.currentPaceSecPerKm,
      avgPaceSecPerKm: state.avgPaceSecPerKm,
      bestPaceSecPerKm: state.bestPaceSecPerKm,
      elevationGainM: state.elevationGainM,
      gpsPoints: state.gpsPoints,
    }

    set({ isActive: false, phase: 'complete', _intervalId: null })
    return stats
  },

  reset: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({ ...initialState })
  },
}))

// ── Fonctions pures (exportées pour réutilisation) ─────────────────────────────

/** Distance Haversine en mètres entre deux points lat/lng */
export function haversineMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calcule l'allure (sec/km) sur la fenêtre glissante des derniers `windowMetres`.
 * Retourne null si pas assez de données.
 */
function computeRollingPace(points: GpsPoint[], windowMetres: number): number | null {
  if (points.length < 2) return null
  let dist = 0
  let i = points.length - 1
  while (i > 0 && dist < windowMetres) {
    dist += haversineMetres(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    )
    i--
  }
  if (dist < 50) return null  // pas assez de données
  const durationSec = (points[points.length - 1].ts - points[i].ts) / 1000
  if (durationSec <= 0) return null
  return Math.round(durationSec / (dist / 1000))
}

/** Beep simple pour la course — volume max */
function playRunningBeep(frequency = 440, duration = 0.4) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(1.0, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch { /* Audio non disponible */ }
}

/** Double beep montant (fin de fractionné) */
function playDoubleRunningBeep() {
  try {
    const ctx = new AudioContext()
    const makeBeep = (startAt: number, freq: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(1.0, startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.4)
      osc.start(startAt)
      osc.stop(startAt + 0.4)
    }
    makeBeep(ctx.currentTime, 880)
    makeBeep(ctx.currentTime + 0.45, 1100)
  } catch { /* Audio non disponible */ }
}

/** Synthèse vocale française */
function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'fr-FR'
    utt.rate = 1.1
    utt.volume = 1.0
    window.speechSynthesis.speak(utt)
  } catch { /* Synthèse vocale non disponible */ }
}
