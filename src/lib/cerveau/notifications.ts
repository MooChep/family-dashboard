'use client'

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (err) {
    console.error('[SW] Enregistrement échoué', err)
    return null
  }
}

export async function subscribeToPush(): Promise<void> {
  // 1. Récupérer la clé VAPID publique
  const keyRes = await fetch('/api/cerveau/push/vapid-key')
  const keyData = await keyRes.json() as { success: boolean; data: string }
  if (!keyData.success) throw new Error('Clé VAPID indisponible')

  // 2. Enregistrer le service worker
  const reg = await registerServiceWorker()
  if (!reg) throw new Error('Service Worker non supporté')

  // Attendre que le SW soit actif
  await navigator.serviceWorker.ready

  // 3. S'abonner via pushManager
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyData.data),
  })

  // 4. Envoyer la subscription au serveur
  const sub = subscription.toJSON()
  await fetch('/api/cerveau/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys?.p256dh,
        auth: sub.keys?.auth,
      },
    }),
  })
}

// ── VAPID key helper ──────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buffer
}
