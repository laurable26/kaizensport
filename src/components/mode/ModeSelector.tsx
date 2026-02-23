import { useState } from 'react'
import { Dumbbell, Footprints } from 'lucide-react'
import { useAppModeStore } from '@/store/appModeStore'
import { useAuth } from '@/hooks/useAuth'
import type { AppMode } from '@/types/app'

interface Props {
  onDone: () => void
}

export default function ModeSelector({ onDone }: Props) {
  const [selected, setSelected] = useState<AppMode | null>(null)
  const [exiting, setExiting] = useState(false)
  const { setMode, syncToSupabase } = useAppModeStore()
  const { user } = useAuth()

  const confirm = async () => {
    if (!selected) return
    setMode(selected)
    if (user) {
      syncToSupabase(user.id, selected).catch(() => null)
    }
    setExiting(true)
    setTimeout(onDone, 400)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center
        bg-[var(--color-bg)] transition-opacity duration-500
        ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{
        paddingTop: 'var(--safe-area-top)',
        paddingBottom: 'var(--safe-area-bottom)',
      }}
    >
      <div className="px-6 w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl mb-4">🏅</div>
          <h1 className="text-3xl font-black">Quel est ton sport ?</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Tu pourras changer ça dans ton profil
          </p>
        </div>

        {/* Cartes de sélection */}
        <div className="space-y-3">
          {/* Musculation */}
          <button
            onClick={() => setSelected('musculation')}
            className={`w-full p-5 rounded-2xl border-2 transition-all active-scale flex items-center gap-4 text-left
              ${selected === 'musculation'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
              ${selected === 'musculation'
                ? 'bg-[var(--color-accent)]'
                : 'bg-[var(--color-surface-2)]'
              }`}
            >
              <Dumbbell
                size={22}
                className={selected === 'musculation' ? 'text-white' : 'text-[var(--color-text-muted)]'}
              />
            </div>
            <div>
              <p className="font-bold text-base">Musculation</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Séances, exercices, séries & répétitions
              </p>
            </div>
            {selected === 'musculation' && (
              <div className="ml-auto w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>

          {/* Course */}
          <button
            onClick={() => setSelected('running')}
            className={`w-full p-5 rounded-2xl border-2 transition-all active-scale flex items-center gap-4 text-left
              ${selected === 'running'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
              ${selected === 'running'
                ? 'bg-[var(--color-accent)]'
                : 'bg-[var(--color-surface-2)]'
              }`}
            >
              <Footprints
                size={22}
                className={selected === 'running' ? 'text-white' : 'text-[var(--color-text-muted)]'}
              />
            </div>
            <div>
              <p className="font-bold text-base">Course à pied</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                GPS, allure, fractionné, records personnels
              </p>
            </div>
            {selected === 'running' && (
              <div className="ml-auto w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        </div>

        {/* Bouton confirmer */}
        <button
          disabled={!selected}
          onClick={confirm}
          className={`w-full py-4 rounded-2xl font-bold text-base active-scale transition-all
            ${selected
              ? 'bg-[var(--color-accent)] text-white neon'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
            }`}
        >
          Commencer →
        </button>
      </div>
    </div>
  )
}
