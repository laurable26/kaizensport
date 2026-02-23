import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useSessionStore } from '@/store/sessionStore'
import { useRunningStore } from '@/store/runningStore'
import { useAppModeStore } from '@/store/appModeStore'
import OnboardingOverlay, { hasCompletedOnboarding } from '@/components/onboarding/OnboardingOverlay'
import ModeSelector from '@/components/mode/ModeSelector'

export default function AppShell() {
  const isSessionActive = useSessionStore((s) => s.isActive)
  const sessionName = useSessionStore((s) => s.sessionName)
  const isRunActive = useRunningStore((s) => s.isActive)
  const runName = useRunningStore((s) => s.sessionName)
  const { mode } = useAppModeStore()
  const navigate = useNavigate()

  const [showOnboarding, setShowOnboarding] = useState(!hasCompletedOnboarding())
  const [showModeSelector, setShowModeSelector] = useState(false)

  // Après l'onboarding, afficher le sélecteur de mode si pas encore choisi
  const handleOnboardingDone = () => {
    setShowOnboarding(false)
    if (!mode) setShowModeSelector(true)
  }

  // Si l'onboarding est déjà fait mais que le mode n'est jamais été choisi
  // (ex : utilisateur existant avant la feature)
  const needsModeSelector = !showOnboarding && mode === null

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
          className="w-full bg-[var(--color-success)] text-white text-sm font-semibold py-2 px-4 text-center active-scale z-50 sticky top-0"
          style={{ paddingTop: `calc(var(--safe-area-top) + 0.5rem)` }}
        >
          🏃 Course en cours : {runName || 'Course libre'} — Reprendre
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
        <OnboardingOverlay onDone={handleOnboardingDone} />
      )}

      {/* Sélecteur de mode (après onboarding ou si mode pas encore choisi) */}
      {(showModeSelector || needsModeSelector) && (
        <ModeSelector onDone={() => setShowModeSelector(false)} />
      )}
    </div>
  )
}
