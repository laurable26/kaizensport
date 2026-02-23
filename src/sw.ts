/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// Workbox manifest injection (remplacé automatiquement par Vite PWA)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Skip waiting et claim immédiatement
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ── Runtime caching ───────────────────────────────────────────
registerRoute(
  ({ url }) => url.hostname.includes('.supabase.co') && url.pathname.includes('/rest/v1/exercises'),
  new StaleWhileRevalidate({
    cacheName: 'exercises-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 86400 })],
  })
)

registerRoute(
  ({ url }) => url.hostname.includes('.supabase.co') && url.pathname.includes('/storage/v1/'),
  new CacheFirst({
    cacheName: 'photos-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 })],
  })
)

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string } = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Kaizen Sport', body: event.data.text(), url: '/' }
  }

  const title = data.title ?? 'Kaizen Sport'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/logo.svg',
    badge: data.badge ?? '/icons/logo.svg',
    data: { url: data.url ?? '/' },
    vibrate: [200, 100, 200],
    actions: [{ action: 'open', title: 'Ouvrir' }],
    requireInteraction: false,
    tag: data.url ?? 'kaizen-notif',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Click sur notification ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url: string = (event.notification.data as { url?: string })?.url ?? '/'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            ;(client as WindowClient).focus()
            return (client as WindowClient).navigate(fullUrl)
          }
        }
        return self.clients.openWindow(fullUrl)
      })
  )
})
