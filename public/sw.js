/* eslint-disable */
// Service Worker — Cerveau Push Notifications

const CACHE_NAME = 'cerveau-v1'

// ── Install / Activate ────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Push ──────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  // Actions dynamiques depuis le payload (slots snooze personnalisés)
  const snoozeActions = (data.snoozeOptions ?? [
    { action: 'snooze_0', label: '15 min' },
    { action: 'snooze_1', label: '1 heure' },
  ]).map(s => ({ action: s.action, title: s.label }))

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Cerveau', {
      body:  data.body ?? '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:   data.entryId ?? 'cerveau',
      data: {
        entryId:             data.entryId,
        url:                 data.url ?? '/cerveau',
        snoozeOptions:       data.snoozeOptions,
        defaultSnoozeMinutes: data.defaultSnoozeMinutes ?? 60,
      },
      actions: [
        ...snoozeActions,
        { action: 'done', title: '✓ Fait' },
      ],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { entryId, snoozeOptions, defaultSnoozeMinutes } = event.notification.data ?? {}

  if (event.action === 'done' && entryId) {
    event.waitUntil(
      fetch(`/api/cerveau/entries/${entryId}/done`, {
        method: 'POST',
        credentials: 'include',
      })
    )
    return
  }

  if (event.action.startsWith('snooze_') && entryId) {
    const slot    = (snoozeOptions ?? []).find(s => s.action === event.action)
    const minutes = slot?.minutes ?? defaultSnoozeMinutes ?? 60
    const until   = new Date(Date.now() + minutes * 60_000).toISOString()
    event.waitUntil(
      fetch(`/api/cerveau/entries/${entryId}/snooze`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ until }),
      })
    )
    return
  }

  // Clic direct → ouvrir / focus l'app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const target = entryId ? `/cerveau` : (event.notification.data?.url ?? '/cerveau')
      const existing = clients.find(c => c.url.includes('/cerveau'))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })
  )
})
