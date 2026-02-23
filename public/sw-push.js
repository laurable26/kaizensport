// Service Worker custom pour les Push Notifications Kaizen Sport
// Ce fichier est importé par le SW généré par Vite PWA via customServiceWorker

// Écouter les événements push
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Kaizen Sport', body: event.data.text(), url: '/' }
  }

  const title = data.title ?? 'Kaizen Sport'
  const options = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/logo.svg',
    badge: data.badge ?? '/icons/logo.svg',
    data: { url: data.url ?? '/' },
    // Vibration pattern sur Android
    vibrate: [200, 100, 200],
    // Actions rapides (bouton "Ouvrir")
    actions: [
      { action: 'open', title: 'Ouvrir' },
    ],
    requireInteraction: false,
    // Regroupe les notifs du même type
    tag: data.url ?? 'kaizen-notif',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Gérer le click sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url ?? '/'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si l'app est déjà ouverte, naviguer dans l'onglet existant
      for (const client of windowClients) {
        if ('focus' in client && 'navigate' in client) {
          client.focus()
          return client.navigate(fullUrl)
        }
      }
      // Sinon ouvrir un nouvel onglet
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    })
  )
})
