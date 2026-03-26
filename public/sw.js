/* eslint-disable */
// Service Worker — Cerveau Push Notifications

const CACHE_NAME = 'cerveau-v1'

// ── Install / Activate ────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Push ──────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'Cerveau'
  const body  = data.body  ?? ''

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:   data.entryId ?? 'cerveau',
      data:  { entryId: data.entryId, url: data.url ?? '/cerveau' },
      actions: [
        { action: 'snooze_15', title: '15 min' },
        { action: 'snooze_1h', title: '1 heure' },
        { action: 'done',      title: '✓ Fait'  },
      ],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { entryId, url } = event.notification.data ?? {}

  if (event.action === 'done' && entryId) {
    event.waitUntil(
      fetch(`/api/cerveau/entries/${entryId}/done`, { method: 'POST' })
    )
    return
  }

  if ((event.action === 'snooze_15' || event.action === 'snooze_1h') && entryId) {
    const minutes = event.action === 'snooze_15' ? 15 : 60
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    event.waitUntil(
      fetch(`/api/cerveau/entries/${entryId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ until }),
      })
    )
    return
  }

  // Default: open/focus app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const target = url ?? '/cerveau'
      const existing = clients.find(c => c.url.includes(target))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })
  )
})
