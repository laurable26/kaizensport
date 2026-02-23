import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  photoUrl: string | null
  name?: string
  className?: string
  iconSize?: number
}

/**
 * Affiche la photo d'un exercice.
 * photo_url peut être :
 *   - null → affiche l'icône
 *   - un chemin Supabase Storage "userId/exerciseId.webp" → génère URL signée
 *   - une URL complète (http...) → utilise directement
 */
export default function ExercisePhoto({ photoUrl, name, className = '', iconSize = 28 }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [error, setError] = useState(false)

  // Détermine si c'est un chemin relatif ou une URL complète
  const isFullUrl = photoUrl?.startsWith('http') ?? false

  // Pour les chemins relatifs, génère une URL signée une seule fois
  if (photoUrl && !isFullUrl && !tried) {
    setTried(true)
    supabase.storage
      .from('exercise-photos')
      .createSignedUrl(photoUrl, 60 * 60 * 24) // 24h
      .then(({ data }) => {
        if (data?.signedUrl) setSignedUrl(data.signedUrl)
        else setError(true)
      })
      .catch(() => setError(true))
  }

  const src = isFullUrl ? photoUrl : signedUrl

  if (!photoUrl || error || (!src && tried)) {
    return (
      <div className={`flex items-center justify-center bg-[var(--color-surface-2)] ${className}`}>
        <Dumbbell size={iconSize} className="text-[var(--color-text-muted)]" />
      </div>
    )
  }

  if (!src) {
    // Loading skeleton
    return <div className={`animate-pulse bg-[var(--color-surface-2)] ${className}`} />
  }

  return (
    <img
      src={src}
      alt={name ?? 'Exercise'}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  )
}
