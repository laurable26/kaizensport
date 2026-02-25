import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useSessionStore } from '@/store/sessionStore'
import { useRunningStore } from '@/store/runningStore'
import OnboardingOverlay, { hasCompletedOnboarding } from '@/components/onboarding/OnboardingOverlay'

export default function AppShell() {
  const isSessionActive = useSessionStore((s) => s.isActive)
  const sessionName = useSessionStore((s) => s.sessionName)
  const isRunActive = useRunningStore((s) => s.isActive)
  const runName = useRunningStore((s) => s.sessionName)
  const navigate = useNavigate()

  const [showOnboarding, setShowOnboarding] = useState(!hasCompletedOnboarding())

  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg)]">
      {/* Bannière séance musculation en cours */}
      {isSessionActive && (
        <button
          onClick={() => navigate('/sessions/active')}
          className="w-full bg-[var(--color-accent)] text-white text-sm font-semibold py-2 px-4 text-center active-scale z-50 sticky top-0"
          style={{ paddingTop: `calc(var(--safe-area-top) + 0.5rem)` }}
        >
          Séance en cours : {sessionName} — Reprendre
        </button>
      )}

      {/* Bannière course en cours */}
      {isRunActive && !isSessionActive && (
        <button
          onClick={() => navigate('/running/active')}
          className="w-full bg-[var(--color-accent)] text-white text-sm font-semibold py-2 px-4 text-center active-scale z-50 sticky top-0"
          style={{ paddingTop: `calc(var(--safe-area-top) + 0.5rem)` }}
        >
          Course en cours : {runName || 'Course libre'} — Reprendre
        </button>
      )}

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto pb-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+1rem)]">
        <Outlet />
      </main>

      {/* Navigation du bas */}
      <BottomNav />

      {/* Onboarding au premier lancement */}
      {showOnboarding && (
        <OnboardingOverlay onDone={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}
