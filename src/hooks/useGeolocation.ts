import { useEffect, useRef, useCallback } from 'react'
import { useRunningStore, haversineMetres } from '@/store/runningStore'
import type { GpsPoint } from '@/types/app'

interface UseGeolocationOptions {
  enabled: boolean
  /** Précision GPS minimale requise (mètres). Points plus imprécis sont ignorés. */
  accuracyThreshold?: number
  /** Distance minimale (mètres) entre deux points acceptés. Évite la dérive GPS. */
  minDistanceM?: number
}

/**
 * S'abonne à Geolocation.watchPosition quand enabled=true.
 * Envoie les points GPS valides dans le runningStore.
 *
 * ⚠️ Limitations PWA :
 * - watchPosition se suspend quand l'écran se verrouille ou quand l'app passe
 *   en arrière-plan. Utiliser Screen Wake Lock API en parallèle.
 * - enableHighAccuracy: true → GPS actif = consommation batterie élevée.
 */
export function useGeolocation({
  enabled,
  accuracyThreshold = 30,
  minDistanceM = 5,
}: UseGeolocationOptions) {
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GpsPoint | null>(null)
  const addGpsPoint = useRunningStore((s) => s.addGpsPoint)

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, altitude, accuracy, speed } = pos.coords

      // Filtre de précision : on ignore les fixes GPS trop imprécis
      if (accuracy > accuracyThreshold) return

      const point: GpsPoint = {
        lat: latitude,
        lng: longitude,
        alt: altitude,
        ts: pos.timestamp,
        speed,
        accuracy,
      }

      // Filtre de distance : on ignore les micro-mouvements / dérive stationnaire
      if (lastPointRef.current) {
        const d = haversineMetres(
          lastPointRef.current.lat,
          lastPointRef.current.lng,
          point.lat,
          point.lng
        )
        if (d < minDistanceM) return
      }

      lastPointRef.current = point
      addGpsPoint(point)
    },
    [accuracyThreshold, minDistanceM, addGpsPoint]
  )

  const handleError = useCallback((err: GeolocationPositionError) => {
    console.warn('[useGeolocation] Erreur GPS:', err.message)
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      console.warn('[useGeolocation] Geolocation API non disponible')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, handlePosition, handleError])

  return {
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  }
}
