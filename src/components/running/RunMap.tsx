import { useEffect, useRef } from 'react'

// Import CSS Leaflet
import 'leaflet/dist/leaflet.css'

type LatLng = { lat: number; lng: number }

interface RunMapProps {
  points: LatLng[]
  height?: number | string
  className?: string
}

export default function RunMap({ points, height = 192, className = '' }: RunMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const polylineRef = useRef<import('leaflet').Polyline | null>(null)
  const markerStartRef = useRef<import('leaflet').CircleMarker | null>(null)
  const markerEndRef = useRef<import('leaflet').CircleMarker | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialisation Leaflet lazy (évite SSR)
    import('leaflet').then((L) => {
      // Fix icônes manquantes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current && containerRef.current) {
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map
      }

      const map = mapRef.current!

      // Supprimer l'ancien tracé
      if (polylineRef.current) polylineRef.current.remove()
      if (markerStartRef.current) markerStartRef.current.remove()
      if (markerEndRef.current) markerEndRef.current.remove()

      if (points.length === 0) {
        // Pas de points : centrer sur Paris par défaut
        map.setView([48.8566, 2.3522], 13)
        return
      }

      const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])

      // Polyline colorée style Strava
      const polyline = L.polyline(latlngs, {
        color: 'var(--color-accent, #6366f1)',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map)
      polylineRef.current = polyline

      // Marker de départ (vert)
      const start = L.circleMarker(latlngs[0], {
        radius: 6,
        fillColor: '#22c55e',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map)
      markerStartRef.current = start

      // Marker de position actuelle (accent)
      const end = L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 8,
        fillColor: 'var(--color-accent, #6366f1)',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map)
      markerEndRef.current = end

      // Ajuster la vue sur le tracé
      map.fitBounds(polyline.getBounds(), { padding: [16, 16], maxZoom: 17 })
    })

    return () => {
      // Cleanup à la destruction du composant
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        polylineRef.current = null
        markerStartRef.current = null
        markerEndRef.current = null
      }
    }
  }, []) // Init une seule fois

  // Mise à jour du tracé sans recréer la carte
  useEffect(() => {
    if (!mapRef.current || points.length === 0) return

    import('leaflet').then((L) => {
      const map = mapRef.current!
      const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latlngs)
      } else {
        polylineRef.current = L.polyline(latlngs, {
          color: 'var(--color-accent, #6366f1)',
          weight: 4,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map)
      }

      // Mettre à jour marker fin
      const lastPos = latlngs[latlngs.length - 1]
      if (markerEndRef.current) {
        markerEndRef.current.setLatLng(lastPos)
      }

      // Marker début (une seule fois)
      if (!markerStartRef.current) {
        markerStartRef.current = L.circleMarker(latlngs[0], {
          radius: 6,
          fillColor: '#22c55e',
          color: '#fff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map)
      }

      if (points.length <= 3) {
        // Centrer sur les premiers points
        map.setView(lastPos, 16)
      } else {
        map.fitBounds(polylineRef.current.getBounds(), { padding: [16, 16], maxZoom: 17 })
      }
    })
  }, [points])

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ height }}
    />
  )
}
