/* eslint-disable */
// Service Worker — Cerveau Push Notifications

const CACHE_NAME = 'cerveau-v1'

// ── Install / Activate ────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Push ──────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  const isParchemin = (data.url ?? '').startsWith('/parchemin')

  let notifActions
  if (isParchemin) {
    notifActions = (data.actions ?? [
      { action: 'open',      label: 'Voir !' },
      { action: 'snooze_2h', label: 'Patience' },
      { action: 'pin',       label: 'Clouer' },
    ]).map(a => ({ action: a.action, title: a.label }))
  } else {
    const snoozeActions = (data.snoozeOptions ?? [
      { action: 'snooze_0', label: '15 min' },
      { action: 'snooze_1', label: '1 heure' },
    ]).map(s => ({ action: s.action, title: s.label }))
    notifActions = [...snoozeActions, { action: 'done', title: '✓ Fait' }]
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Notification', {
      body:  data.body ?? '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:   data.entryId ?? data.url ?? 'notif',
      data: {
        entryId:             data.entryId,
        url:                 data.url ?? '/',
        snoozeOptions:       data.snoozeOptions,
        actions:             data.actions,
        defaultSnoozeMinutes: data.defaultSnoozeMinutes ?? 60,
      },
      actions: notifActions,
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { entryId, url, snoozeOptions, actions, defaultSnoozeMinutes } = event.notification.data ?? {}
  const isParchemin = (url ?? '').startsWith('/parchemin')

  // ── Parchemin actions ─────────────────────────────────────────────────────
  if (isParchemin) {
    if (event.action === 'open' || event.action === '') {
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
          const existing = clients.find(c => c.url.includes('/parchemin'))
          if (existing) return existing.navigate(url).then(c => c.focus())
          return self.clients.openWindow(url ?? '/parchemin')
        })
      )
      return
    }

    if (event.action === 'snooze_2h') {
      const until = new Date(Date.now() + 120 * 60_000).toISOString()
      // Extract note id from url (/parchemin/<id>)
      const noteId = (url ?? '').split('/').pop()
      if (noteId) {
        event.waitUntil(
          fetch(`/api/parchemin/notes/${noteId}/notif`, {
            method:      'POST',
            credentials: 'include',
            headers:     { 'Content-Type': 'application/json' },
            body:        JSON.stringify({ notifAt: until, notifTo: 'BOTH' }),
          })
        )
      }
      return
    }

    if (event.action === 'pin') {
      const noteId = (url ?? '').split('/').pop()
      if (noteId) {
        event.waitUntil(
          fetch(`/api/parchemin/notes/${noteId}/pin`, {
            method:      'POST',
            credentials: 'include',
          })
        )
      }
      return
    }

  }

  // ── Cerveau actions ───────────────────────────────────────────────────────
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
      const target   = entryId ? `/cerveau` : (url ?? '/cerveau')
      const existing = clients.find(c => c.url.includes('/cerveau'))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })
  )
})
