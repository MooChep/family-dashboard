/**
 * Labeur Cron — logique exécutée à chaque passage du scheduler horaire.
 *
 * Intégré dans runNotificationScheduler() (notificationScheduler.ts).
 * Ne jamais appeler directement depuis le client.
 *
 * Responsabilités :
 *   1. Régénérer les tâches récurrentes dont le cycle est expiré
 *   2. Mettre à jour les états d'inflation (LabeurInflationState) pour chaque tâche en retard
 *   3. Envoyer les notifications push (rappels retard, alerte inflation, alerte malédiction)
 *   4. Réinitialiser le stock des articles du Marché dont la période est écoulée
 */

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from './settings'
import { cronRegenerateExpiredTasks } from './recurrence'
import { daysOverdue } from './timezone'
import {
  computeInflationContrib,
  sumInflation,
  applyInflationCap,
  isAboveAlert,
  isCursed,
} from './inflation'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LabeurCronResult = {
  regenerated:      number   // tâches régénérées par cycle expiré
  inflationUpdated: number   // entrées LabeurInflationState créées/mises à jour
  inflationRemoved: number   // entrées supprimées (tâches revenues à jour)
  notifsSent:       number   // notifications push envoyées
  stocksReset:      number   // stocks d'articles réinitialisés
}

// ─── Helper push local ────────────────────────────────────────────────────────

type PushPayload = { title: string; body: string; url: string }
type SubRow      = { endpoint: string; p256dh: string; auth: string }

async function sendPush(sub: SubRow, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return true
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) {
      // Subscription expirée — nettoyage
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
    } else {
      console.error('[labeur-cron] push failed', err)
    }
    return false
  }
}

/**
 * Envoie une notification push à tous les membres du foyer.
 * Retourne le nombre de notifications envoyées avec succès.
 */
async function sendToAll(payload: PushPayload): Promise<number> {
  const subs = await prisma.pushSubscription.findMany()
  let sent = 0
  for (const sub of subs) {
    const ok = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    )
    if (ok) sent++
  }
  return sent
}

// ─── Réinitialisation du stock des articles périodiques ───────────────────────

async function resetExpiredStocks(): Promise<number> {
  const now = new Date()

  // Articles désactivés avec une fréquence de réinitialisation et un stock initial
  const items = await prisma.labeurMarketItem.findMany({
    where: {
      isActive:       false,
      resetFrequency: { not: null },
      initialStock:   { not: null },
    },
  })

  let resetCount = 0
  for (const item of items) {
    if (!item.resetFrequency || item.initialStock === null) continue

    const lastReset = item.lastResetAt ?? item.createdAt
    const periodMs  = item.resetFrequency === 'WEEKLY'
      ? 7  * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000   // MONTHLY ≈ 30 jours

    if (now.getTime() - lastReset.getTime() < periodMs) continue

    await prisma.labeurMarketItem.update({
      where: { id: item.id },
      data: {
        stock:       item.initialStock,
        isActive:    true,
        lastResetAt: now,
      },
    })
    resetCount++
  }

  return resetCount
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export async function runLabeurCron(): Promise<LabeurCronResult> {
  const result: LabeurCronResult = {
    regenerated: 0, inflationUpdated: 0, inflationRemoved: 0,
    notifsSent: 0,  stocksReset: 0,
  }

  // Vérifier que VAPID est configuré avant d'envoyer des push
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@famille.fr'
  const canPush = !!(vapidPublic && vapidPrivate)
  if (canPush) webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!)

  const settings = await getLabeurSettings(prisma)
  const tz        = settings.timezone

  // ── 1. Régénération des cycles expirés ────────────────────────────────────
  result.regenerated = await prisma.$transaction((tx) =>
    cronRegenerateExpiredTasks(tx, tz)
  )

  // ── 2. Mise à jour des états d'inflation ──────────────────────────────────
  // Récupérer toutes les tâches récurrentes actives avec leur récurrence
  const tasks = await prisma.labeurTask.findMany({
    where: {
      type:   'RECURRING',
      status: { in: ['ACTIVE', 'PARTIALLY_DONE'] },
      recurrence: { isNot: null },
    },
    include: {
      recurrence:     true,
      inflationStates: true,
    },
  })

  // Tâches en retard avec leur état inflation mis à jour
  type OverdueInfo = {
    taskId:    string
    taskTitle: string
    days:      number
    stateId:   string
    reminderAlreadySent: boolean
  }
  const overdueInfos: OverdueInfo[] = []

  for (const task of tasks) {
    if (!task.recurrence) continue
    const days = daysOverdue(task.recurrence.nextDueAt, tz)

    if (days > 0) {
      const inflationPercent = computeInflationContrib(
        task.ecuValue,
        days,
        task.inflationContribRate
      )

      // Upsert : crée ou met à jour l'entrée d'inflation pour cette tâche
      const state = await prisma.labeurInflationState.upsert({
        where:  { taskId: task.id },
        create: { taskId: task.id, daysOverdue: days, inflationPercent },
        update: { daysOverdue: days, inflationPercent },
      })

      overdueInfos.push({
        taskId:              task.id,
        taskTitle:           task.title,
        days,
        stateId:             state.id,
        reminderAlreadySent: !!state.overdueReminderSentAt,
      })
      result.inflationUpdated++
    } else {
      // Tâche revenue à temps — supprimer son entrée d'inflation
      const deleted = await prisma.labeurInflationState.deleteMany({ where: { taskId: task.id } })
      if (deleted.count > 0) result.inflationRemoved++
    }
  }

  if (!canPush) {
    // Pas de VAPID → on saute les notifications mais on continue le reste
    result.stocksReset = await resetExpiredStocks()
    return result
  }

  // ── 3. Rappels push pour les tâches en retard ─────────────────────────────
  for (const info of overdueInfos) {
    // Ne pas renvoyer si déjà envoyé pour cette instance
    if (info.reminderAlreadySent) continue
    // Seuil configurable : ne pas rappeler avant overdueReminderHours
    if (info.days * 24 < settings.overdueReminderHours) continue

    const sent = await sendToAll({
      title: '⚒ Tâche en retard',
      body:  `"${info.taskTitle}" est en retard depuis ${info.days} jour${info.days > 1 ? 's' : ''} — le Marché en pâtit !`,
      url:   '/labeur',
    })

    if (sent > 0) {
      // Marquer comme envoyé pour éviter les doublons lors des prochains passages
      await prisma.labeurInflationState.update({
        where: { id: info.stateId },
        data:  { overdueReminderSentAt: new Date() },
      })
      result.notifsSent += sent
    }
  }

  // ── 4. Rappels push pour les tâches ONESHOT approchant de leur échéance ─────
  // Envoie un rappel oneshotReminderHours avant le dueDate, une seule fois.
  if (canPush) {
    const oneshotTasks = await prisma.labeurTask.findMany({
      where: {
        type:                  'ONESHOT',
        status:                'ACTIVE',
        dueDate:               { not: null },
        oneshotReminderSentAt: null,
      },
    })

    const reminderWindowMs = settings.oneshotReminderHours * 60 * 60 * 1000
    const now              = new Date()

    for (const task of oneshotTasks) {
      if (!task.dueDate) continue
      const timeUntilDue = task.dueDate.getTime() - now.getTime()
      // Dans la fenêtre de rappel et pas encore passé
      if (timeUntilDue > 0 && timeUntilDue <= reminderWindowMs) {
        const hoursLeft = Math.round(timeUntilDue / 3_600_000)
        const sent = await sendToAll({
          title: `⚒ Tâche à faire bientôt`,
          body:  `"${task.title}" est à faire dans ${hoursLeft}h`,
          url:   `/labeur/taches/${task.id}`,
        })
        if (sent > 0) {
          await prisma.labeurTask.update({
            where: { id: task.id },
            data:  { oneshotReminderSentAt: now },
          })
          result.notifsSent += sent
        }
      }
    }
  }

  // ── 5. Alerte inflation ────────────────────────────────────────────────────
  const allStates      = await prisma.labeurInflationState.findMany()
  const globalInflation = applyInflationCap(sumInflation(allStates), settings.inflationCap)

  if (isAboveAlert(globalInflation, settings.inflationAlertThreshold)) {
    const lastAlert     = settings.lastInflationAlertSentAt
    const hoursSinceLast = lastAlert
      ? (Date.now() - lastAlert.getTime()) / 3_600_000
      : Infinity

    // Debounce 24h pour ne pas spammer
    if (hoursSinceLast >= 24) {
      const sent = await sendToAll({
        title: `⚒ Marché à +${Math.round(globalInflation)} %`,
        body:  `${overdueInfos.length} tâche${overdueInfos.length > 1 ? 's' : ''} en retard gonflent les prix du Marché`,
        url:   '/labeur/marche',
      })

      if (sent > 0) {
        await prisma.labeurSettings.update({
          where: { id: settings.id },
          data:  { lastInflationAlertSentAt: new Date() },
        })
        result.notifsSent += sent
      }
    }
  }

  // ── 6. Alerte malédiction ─────────────────────────────────────────────────
  if (isCursed(globalInflation, settings.curseSeuil)) {
    const lastCurse      = settings.lastCurseAlertSentAt
    const hoursSinceLast = lastCurse
      ? (Date.now() - lastCurse.getTime()) / 3_600_000
      : Infinity

    if (hoursSinceLast >= 24) {
      const sent = await sendToAll({
        title: '🔴 Malédiction sur le Marché !',
        body:  `Inflation à ${Math.round(globalInflation)} % — les articles sont scellés jusqu'au retour à l'ordre`,
        url:   '/labeur/marche',
      })

      if (sent > 0) {
        await prisma.labeurSettings.update({
          where: { id: settings.id },
          data:  { lastCurseAlertSentAt: new Date() },
        })
        result.notifsSent += sent
      }
    }
  }

  // ── 7. Réinitialisation des stocks périodiques ────────────────────────────
  result.stocksReset = await resetExpiredStocks()

  return result
}
