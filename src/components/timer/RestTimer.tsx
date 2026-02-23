import { useTimerStore } from '@/store/timerStore'
import { SkipForward } from 'lucide-react'

export default function RestTimer() {
  const { isActive, mode, secondsRemaining, skip, adjust } = useTimerStore()

  if (!isActive) return null

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const circumference = 2 * Math.PI * 52

  // Pour le cercle : max 2min en repos, durée configurée en travail
  const maxSeconds = mode === 'rest' ? 120 : Math.max(secondsRemaining, 60)
  const progress = secondsRemaining / maxSeconds
  const dashOffset = circumference * (1 - Math.min(progress, 1))

  const isWork = mode === 'work'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 p-8">
        <h2
          className={`text-xl font-bold tracking-widest uppercase ${
            isWork ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
          }`}
        >
          {isWork ? '⏱ Travail' : 'Repos'}
        </h2>

        {/* Circular progress */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--color-surface-2)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={isWork ? 'var(--color-success)' : 'var(--color-accent)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold tabular-nums">
              {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : String(seconds)}
            </span>
          </div>
        </div>

        {/* Adjust buttons — seulement pour le repos */}
        <div className="flex items-center gap-4">
          {!isWork && (
            <button
              onClick={() => adjust(-15)}
              className="w-14 h-14 rounded-full bg-[var(--color-surface)] flex items-center justify-center active-scale"
            >
              <span className="text-sm font-bold text-[var(--color-text-muted)]">-15s</span>
            </button>
          )}
          <button
            onClick={skip}
            className="w-20 h-20 rounded-full bg-[var(--color-surface-2)] flex flex-col items-center justify-center gap-1 active-scale"
          >
            <SkipForward size={24} />
            <span className="text-xs">{isWork ? 'Passer' : 'Skip'}</span>
          </button>
          {!isWork && (
            <button
              onClick={() => adjust(15)}
              className="w-14 h-14 rounded-full bg-[var(--color-surface)] flex items-center justify-center active-scale"
            >
              <span className="text-sm font-bold text-[var(--color-text-muted)]">+15s</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
