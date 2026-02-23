import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '')
      },
      setTheme: (t) => {
        set({ theme: t })
        document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '')
      },
    }),
    { name: 'kaizen-theme' }
  )
)

// Apply stored theme on load
export function initTheme() {
  const stored = localStorage.getItem('kaizen-theme')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
      }
    } catch { /* ignore */ }
  }
}
