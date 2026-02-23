import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'

const STORAGE_KEY = 'kaizen_onboarded'

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markOnboardingDone(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

// ── Slides ────────────────────────────────────────────────────────────────────
const slides = [
  {
    emoji: '👋',
    title: 'Bienvenue sur\nKaizen Sport',
    subtitle: 'Ton compagnon d\'entraînement intelligent. Suis ta progression, planifie tes séances et deviens meilleur chaque jour.',
    accent: false,
  },
  {
    emoji: '🏋️',
    title: 'Crée tes exercices',
    subtitle: 'Construis ta bibliothèque d\'exercices personnalisés avec photos, groupes musculaires et notes. Tous tes mouvements au même endroit.',
    accent: false,
  },
  {
    emoji: '📋',
    title: 'Planifie tes séances',
    subtitle: 'Compose des séances avec tes exercices, configure séries, reps ou durée, et planifie-les dans ton agenda. Reçois des rappels à l\'heure choisie.',
    accent: false,
  },
  {
    emoji: '⏱️',
    title: 'Entraîne-toi\nen temps réel',
    subtitle: 'Suis chaque série, entre tes poids et reps, laisse le timer de repos gérer les pauses. Concentre-toi sur ta performance.',
    accent: false,
  },
  {
    emoji: '📈',
    title: 'Suis ta progression',
    subtitle: 'Consulte ton historique complet, analyse ton volume d\'entraînement et tes temps. Chaque séance compte dans ton évolution.',
    accent: false,
  },
  {
    emoji: '🚀',
    title: 'Prêt à commencer ?',
    subtitle: 'Kaizen (改善) signifie l\'amélioration continue. Commence par créer ton premier exercice ou ta première séance.',
    accent: true,
    cta: 'Commencer',
  },
]

interface Props {
  onDone: () => void
}

export default function OnboardingOverlay({ onDone }: Props) {
  const [current, setCurrent] = useState(0)
  const [exiting, setExiting] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const navigate = useNavigate()

  const isLast = current === slides.length - 1

  const next = () => {
    if (isLast) {
      handleFinish()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  const handleFinish = () => {
    setExiting(true)
    markOnboardingDone()
    setTimeout(() => {
      onDone()
    }, 400)
  }

  const handleSkip = () => {
    handleFinish()
  }

  // Swipe horizontal
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    // Swipe horizontal significatif (> 50px) et plus horizontal que vertical
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      if (dx < 0 && !isLast) setCurrent((c) => c + 1)
      if (dx > 0 && current > 0) setCurrent((c) => c - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const slide = slides[current]

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-[var(--color-bg)] transition-opacity duration-400 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Bouton passer */}
      <div className="flex justify-end px-5 pt-4 pb-2">
        {!isLast ? (
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] active-scale"
          >
            Passer
            <X size={14} />
          </button>
        ) : (
          <div className="h-7" />
        )}
      </div>

      {/* Contenu slide */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Emoji / illustration */}
        <div
          className={`w-28 h-28 rounded-3xl flex items-center justify-center text-6xl mb-8 transition-all duration-300 ${
            slide.accent
              ? 'bg-[var(--color-accent)] shadow-[0_0_40px_var(--color-accent)] neon'
              : 'bg-[var(--color-surface)]'
          }`}
        >
          {slide.emoji}
        </div>

        <h1
          className="text-3xl font-black leading-tight mb-4 whitespace-pre-line text-[var(--color-text)]"
          key={`title-${current}`}
        >
          {slide.title}
        </h1>

        <p
          className="text-[var(--color-text-muted)] text-base leading-relaxed max-w-xs"
          key={`sub-${current}`}
        >
          {slide.subtitle}
        </p>

        {/* Raccourcis navigations sur le dernier slide */}
        {isLast && (
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => { handleFinish(); setTimeout(() => navigate('/exercises/new'), 450) }}
              className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] text-sm font-semibold active-scale"
            >
              + Exercice
            </button>
            <button
              onClick={() => { handleFinish(); setTimeout(() => navigate('/sessions/new'), 450) }}
              className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] text-sm font-semibold active-scale"
            >
              + Séance
            </button>
          </div>
        )}
      </div>

      {/* Footer : dots + bouton */}
      <div className="px-6 pb-8 space-y-6">
        {/* Indicateurs de progression */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 bg-[var(--color-accent)]'
                  : 'w-1.5 bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {/* Bouton suivant / commencer */}
        <button
          onClick={next}
          className={`w-full py-4 rounded-2xl font-bold text-base active-scale flex items-center justify-center gap-2 transition-all ${
            isLast
              ? 'bg-[var(--color-accent)] text-white neon'
              : 'bg-[var(--color-surface)] text-[var(--color-text)]'
          }`}
        >
          {isLast ? (
            <>🚀 {slide.cta}</>
          ) : (
            <>
              Suivant
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
