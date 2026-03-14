import webpush from 'web-push'
import { type NotificationType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ── Configuration VAPID ──

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@family-dashboard.local',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

// ── Types ──

export interface PushAction {
  action: string
  title:  string
}

export interface PushPayload {
  type:    NotificationType
  title:   string
  body:    string
  entryId: string | null
  actions: PushAction[]
  /** Deep link ouvert au tap sur la notification. */
  url:     string
}

// ── Actions prédéfinies ──

const SNOOZE_ACTIONS: PushAction[] = [
  { action: 'snooze_15m',     title: '15 min' },
  { action: 'snooze_1h',      title: '1h' },
  { action: 'snooze_tonight', title: 'Ce soir' },
]

const ENRICHMENT_ACTIONS: PushAction[] = [
  { action: '',        title: 'Ajouter' },
  { action: 'dismiss', title: 'Ignorer' },
]

// ── buildPayload ──

/**
 * Construit le payload push selon le type de notification.
 * Les `actions` correspondent exactement aux handlers du service worker.
 */
export function buildPayload(
  type:    NotificationType,
  title:   string,
  body:    string,
  entryId: string | null,
): PushPayload {
  const url = entryId ? `/cerveau/entries/${entryId}` : '/cerveau'

  const actions: PushAction[] =
    type === 'REMINDER' || type === 'EVENT'
      ? SNOOZE_ACTIONS
      : type === 'ENRICHMENT'
        ? ENRICHMENT_ACTIONS
        : []

  return { type, title, body, entryId, actions, url }
}

// ── sendPush ──

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 * Utilise `Promise.allSettled` pour ne pas échouer si un device est invalide.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      )
    )
  )
}
