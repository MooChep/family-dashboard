'use client'

import { useEffect, useRef, type ReactElement } from 'react'
import { useSession } from 'next-auth/react'

// ── Helpers ──

/** Convertit la clé VAPID publique (base64url) en Uint8Array pour l'API PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

/**
 * Enregistre le service worker et souscrit aux notifications push.
 * Stocke la souscription en base via POST /api/cerveau/push/subscribe.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (err) {
    console.error('SW registration failed:', err)
    return null
  }
}

async function subscribeToPush(): Promise<void> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const reg = await registerServiceWorker()
  if (!reg) return

  // Attendre que le SW soit actif
  await navigator.serviceWorker.ready

  const existing = await reg.pushManager.getSubscription()
  const sub      = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly:      true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  })

  const json = sub.toJSON() as {
    endpoint: string
    keys:     { p256dh: string; auth: string }
  }

  await fetch('/api/cerveau/push/subscribe', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
}

// ── Composant ──

/**
 * Composant invisible qui demande la permission push et enregistre la
 * souscription en base au montage — silencieux si déjà souscrit.
 * À inclure une seule fois dans le layout Cerveau côté client.
 */
export function PushSetup(): ReactElement | null {
  const { data: session } = useSession()
  const didRun = useRef(false)

  useEffect(() => {
    if (!session?.user?.id) return
    if (didRun.current) return
    didRun.current = true

    // Démarrer la souscription seulement si les APIs sont disponibles
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    // Si la permission est déjà refusée, ne pas relancer la demande
    if (Notification.permission === 'denied') return

    void subscribeToPush()
  }, [session?.user?.id])

  return null
}
