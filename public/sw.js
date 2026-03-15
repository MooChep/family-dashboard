// ── Service Worker — Cerveau push notifications ──
// Intercepte les push events et gère les actions (snooze, dismiss)
// sans avoir besoin d'ouvrir l'application.

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Cerveau', {
      body:    data.body ?? '',
      data:    { entryId: data.entryId, url: data.url ?? '/cerveau' },
      actions: data.actions ?? [],
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     data.entryId ?? 'cerveau',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { entryId, url } = event.notification.data
  const action = event.action // 'snooze_15m' | 'snooze_1h' | 'snooze_tonight' | 'dismiss' | ''

  // ── Dismiss enrichissement ──
  if (action === 'dismiss') {
    // Marque la discussion comme enrichie côté serveur
    if (entryId) {
      event.waitUntil(
        fetch(`/api/cerveau/entries/${entryId}/dismiss-enrichment`, {
          method: 'POST',
        })
      )
    }
    return
  }

  // ── Snooze ──
  if (action.startsWith('snooze_')) {
    /** @type {Record<string, string>} */
    const durationMap = {
      snooze_15m:     'PT15M',
      snooze_1h:      'PT1H',
      snooze_3h:      'PT3H',
      snooze_tonight: 'TONIGHT',
    }
    const duration = durationMap[action]
    if (entryId && duration) {
      event.waitUntil(
        fetch(`/api/cerveau/entries/${entryId}/snooze`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ duration }),
        })
      )
    }
    return
  }

  // ── Tap principal → ouvrir ou focus l'app ──
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// ── Activation immédiate sans attendre la fermeture des onglets ──
self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
