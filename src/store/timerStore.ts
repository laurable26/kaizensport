import { create } from 'zustand'

type TimerMode = 'rest' | 'work'

interface TimerStore {
  isActive: boolean
  mode: TimerMode
  secondsRemaining: number
  defaultRestSeconds: number
  _intervalId: ReturnType<typeof setInterval> | null
  onWorkEnd: (() => void) | null  // callback déclenché quand le timer travail se termine

  start: (seconds?: number, mode?: TimerMode, onEnd?: () => void) => void
  skip: () => void
  adjust: (delta: number) => void
  setDefault: (seconds: number) => void
  _tick: () => void
  _stop: () => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isActive: false,
  mode: 'rest',
  secondsRemaining: 0,
  defaultRestSeconds: 90,
  _intervalId: null,
  onWorkEnd: null,

  start: (seconds, mode = 'rest', onEnd) => {
    const secs = seconds ?? get().defaultRestSeconds
    get()._stop()

    if (mode === 'rest') {
      // Vibration courte = début repos
      if (navigator.vibrate) navigator.vibrate(100)
      // Beep aigu = fin du travail / début repos
      playBeep(660, 0.15)
    } else {
      // mode work : son grave = c'est parti !
      playBeep(330, 0.2)
    }

    const intervalId = setInterval(() => get()._tick(), 1000)
    set({ isActive: true, mode, secondsRemaining: secs, _intervalId: intervalId, onWorkEnd: onEnd ?? null })
  },

  skip: () => {
    const { onWorkEnd, mode } = get()
    get()._stop()
    set({ isActive: false, secondsRemaining: 0, onWorkEnd: null })
    // Si on skip un timer travail, on déclenche quand même le callback (pour lancer le repos)
    if (mode === 'work' && onWorkEnd) {
      onWorkEnd()
    }
  },

  adjust: (delta) => {
    set((state) => ({
      secondsRemaining: Math.max(0, state.secondsRemaining + delta),
    }))
  },

  setDefault: (seconds) => {
    set({ defaultRestSeconds: seconds })
  },

  _tick: () => {
    const { secondsRemaining, mode, onWorkEnd } = get()
    if (secondsRemaining <= 1) {
      get()._stop()
      set({ isActive: false, secondsRemaining: 0, onWorkEnd: null })

      if (mode === 'rest') {
        // Fin repos : double vibration + double beep
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        playDoubleBeep()
      } else {
        // Fin travail : vibration simple + beep aigu
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        playBeep(880, 0.3)
        // Déclencher le callback (démarrer le repos)
        if (onWorkEnd) onWorkEnd()
      }
    } else {
      set({ secondsRemaining: secondsRemaining - 1 })
    }
  },

  _stop: () => {
    const { _intervalId } = get()
    if (_intervalId) clearInterval(_intervalId)
    set({ _intervalId: null })
  },
}))

/** Son simple à la fréquence donnée */
function playBeep(frequency = 880, duration = 0.3) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available
  }
}

/** Double beep (fin de repos) */
function playDoubleBeep() {
  try {
    const ctx = new AudioContext()
    const makeBeep = (startAt: number, freq: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.3)
      osc.start(startAt)
      osc.stop(startAt + 0.3)
    }
    makeBeep(ctx.currentTime, 880)
    makeBeep(ctx.currentTime + 0.35, 1100)
  } catch {
    // Audio not available
  }
}
