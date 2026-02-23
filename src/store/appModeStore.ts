import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppMode } from '@/types/app'
import { supabase } from '@/lib/supabase'

interface AppModeStore {
  mode: AppMode | null   // null = jamais choisi (ModeSelector s'affiche)
  setMode: (m: AppMode) => void
  syncToSupabase: (userId: string, m: AppMode) => Promise<void>
}

export const useAppModeStore = create<AppModeStore>()(
  persist(
    (set) => ({
      mode: null,

      setMode: (m) => set({ mode: m }),

      syncToSupabase: async (userId, m) => {
        // Fire-and-forget : localStorage est la source de vérité pour la rapidité,
        // Supabase sert à la synchronisation multi-appareils
        await supabase
          .from('profiles')
          .upsert({ id: userId, app_mode: m }, { onConflict: 'id' })
      },
    }),
    { name: 'kaizen-mode' }
  )
)
