import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Retourne une URL signée (24h) à partir d'un chemin de stockage Supabase,
 * ou l'URL directe si elle commence par "http".
 * Retourne null si aucun chemin fourni.
 */
export function useAvatarUrl(rawPath: string | null | undefined): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!rawPath) { setAvatarUrl(null); return }
    if (rawPath.startsWith('http')) { setAvatarUrl(rawPath); return }
    supabase.storage
      .from('profile-photos')
      .createSignedUrl(rawPath, 60 * 60 * 24)
      .then(({ data }) => { if (data?.signedUrl) setAvatarUrl(data.signedUrl) })
  }, [rawPath])

  return avatarUrl
}
