/**
 * Notification Scheduler — à exécuter côté serveur (processus séparé ou cron)
 *
 * Usage : GET /api/cerveau/push/schedule (appelable depuis un cron système)
 * Fréquence recommandée : toutes les minutes via `crontab -e`:
 *   * * * * * curl -s http://localhost:3000/api/cerveau/push/schedule
 */

import webpush from 'web-push'
import type { CerveauEntry, CerveauPreferences } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isQuietTime } from '@/lib/cerveau/isQuietTime'
import { resolveSnoozeSlots, getDefaultSnoozeMinutes } from '@/lib/cerveau/snoozeOptions'

type PushPayload = {
  title:                string
  body:                 string
  entryId?:             string
  url:                  string
  snoozeOptions?:       { action: string; label: string; minutes: number }[]
  defaultSnoozeMinutes?: number
}

type SubRow = {
  endpoint: string
  p256dh:   string
  auth:     string
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function sendPush(sub: SubRow, payload: PushPayload): Promise<void> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
  } catch (err) {
    console.error('[scheduler] push failed', err)
  }
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString('fr-FR', {
    day:    'numeric',
    month:  'long',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ── Recurrence processor ───────────────────────────────────────────────────

const RECURRENCE_MS: Record<string, number> = {
  quotidien: 1 * 24 * 60 * 60 * 1000,
  hebdo:     7 * 24 * 60 * 60 * 1000,
  mensuel:   30 * 24 * 60 * 60 * 1000,
  annuel:    365 * 24 * 60 * 60 * 1000,
}

async function processRecurringEntries(): Promise<number> {
  const now = new Date()

  const doneRecurring = await prisma.cerveauEntry.findMany({
    where: {
      status:     'DONE',
      recurrence: { not: null },
      doneAt:     { not: null },
    },
  })

  let created = 0
  for (const entry of doneRecurring) {
    const offsetMs = RECURRENCE_MS[entry.recurrence ?? '']
    if (!offsetMs || !entry.doneAt) continue

    const nextDate = new Date(entry.doneAt.getTime() + offsetMs)
    if (nextDate > now) continue

    await prisma.cerveauEntry.create({
      data: {
        type:        entry.type,
        title:       entry.title,
        body:        entry.body,
        priority:    entry.priority,
        assignedTo:  entry.assignedTo,
        tags:        entry.tags,
        recurrence:  entry.recurrence,
        dueDate:     nextDate,
        createdById: entry.createdById,
      },
    })
    created++
  }
  return created
}

// ── Escalation sender ──────────────────────────────────────────────────────

async function sendWithEscalation(
  entry: CerveauEntry,
  subs:  SubRow[],
  prefs: CerveauPreferences | null,
): Promise<boolean> {
  const count = entry.notificationCount

  if (count >= 4) return false

  if (entry.lastNotifiedAt) {
    const minutesSinceLast = (Date.now() - entry.lastNotifiedAt.getTime()) / 60_000
    if (count === 1 && minutesSinceLast < 30) return false
    if (count === 2 && minutesSinceLast < 60) return false
    if (count === 3 && minutesSinceLast < 60) return false
  }

  const title = count >= 3
    ? `⚠️ Urgent : ${entry.title}`
    : entry.title

  const triggerDate = entry.remindAt ?? entry.dueDate ?? new Date()
  const body = count >= 1
    ? `Rappel ${count + 1} — ${formatAbsolute(triggerDate)}`
    : formatAbsolute(triggerDate)

  const slots = resolveSnoozeSlots(prefs)
  const payload: PushPayload = {
    title,
    body,
    entryId:             entry.id,
    url:                 '/cerveau',
    snoozeOptions:        slots.map(s => ({ action: s.action, label: s.label, minutes: s.minutes })),
    defaultSnoozeMinutes: getDefaultSnoozeMinutes(prefs),
  }

  for (const sub of subs) {
    await sendPush(sub, payload)
  }

  await prisma.cerveauEntry.update({
    where: { id: entry.id },
    data: {
      notificationCount: { increment: 1 },
      lastNotifiedAt:    new Date(),
    },
  })

  return true
}

// ── Weekly recap ───────────────────────────────────────────────────────────

async function sendWeeklyRecap(
  userId: string,
  subs:   SubRow[],
  prefs:  CerveauPreferences | null,
  now:    Date,
): Promise<void> {
  if (now.getDay() !== 0) return
  if (now.getHours() < 19 || now.getHours() >= 20) return

  if (prefs?.weeklyRecapEnabled === false) return

  if (prefs?.lastWeeklyRecapAt) {
    const daysSince = (now.getTime() - prefs.lastWeeklyRecapAt.getTime()) / 86_400_000
    if (daysSince < 6) return
  }

  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [doneTodos, overdueTodos, openDiscussions] = await Promise.all([
    prisma.cerveauEntry.count({
      where: { createdById: userId, status: 'DONE', doneAt: { gte: weekAgo } },
    }),
    prisma.cerveauEntry.count({
      where: { createdById: userId, status: 'ACTIVE', type: 'TODO', dueDate: { lt: now } },
    }),
    prisma.cerveauEntry.count({
      where: { createdById: userId, status: 'ACTIVE', type: 'DISCUSSION' },
    }),
  ])

  const title = '📊 Récap de la semaine'
  const body  = `${doneTodos} tâches faites · ${overdueTodos} en retard · ${openDiscussions} discussions ouvertes`

  for (const sub of subs) {
    await sendPush(sub, { title, body, url: '/cerveau' })
  }

  await prisma.cerveauPreferences.upsert({
    where:  { userId },
    update: { lastWeeklyRecapAt: now },
    create: { userId, lastWeeklyRecapAt: now },
  })
}

// ── Daily digest ───────────────────────────────────────────────────────────

async function sendDailyDigest(
  userId: string,
  subs:   SubRow[],
  prefs:  CerveauPreferences | null,
  now:    Date,
): Promise<void> {
  const digestTime = prefs?.morningDigestAt ?? '08:00'
  const [h, m] = digestTime.split(':').map(Number)

  const scheduledMinutes = h * 60 + m
  const nowMinutes       = now.getHours() * 60 + now.getMinutes()

  if (Math.abs(nowMinutes - scheduledMinutes) > 5) return

  if (prefs?.lastDailyDigestAt) {
    const hoursSince = (now.getTime() - prefs.lastDailyDigestAt.getTime()) / 3_600_000
    if (hoursSince < 20) return
  }

  if (isQuietTime(now, prefs?.quietFrom ?? null, prefs?.quietUntil ?? null)) return

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

  const [todayItems, overdue] = await Promise.all([
    prisma.cerveauEntry.count({
      where: {
        createdById: userId,
        status:      'ACTIVE',
        type:        { in: ['TODO', 'REMINDER'] },
        dueDate:     { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.cerveauEntry.count({
      where: {
        createdById: userId,
        status:      'ACTIVE',
        dueDate:     { lt: startOfDay },
      },
    }),
  ])

  if (todayItems === 0 && overdue === 0) return

  const weekday = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const title   = `☀️ Bonjour — ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`
  const parts: string[] = []
  if (todayItems > 0) parts.push(`${todayItems} tâche${todayItems > 1 ? 's' : ''} aujourd'hui`)
  if (overdue   > 0) parts.push(`${overdue} en retard`)
  const body = parts.join(' · ')

  for (const sub of subs) {
    await sendPush(sub, { title, body, url: '/cerveau' })
  }

  await prisma.cerveauPreferences.upsert({
    where:  { userId },
    update: { lastDailyDigestAt: now },
    create: { userId, lastDailyDigestAt: now },
  })
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function runNotificationScheduler(): Promise<{ sent: number; recurrences: number }> {
  const now = new Date()

  // Initialiser VAPID ici (runtime uniquement) — jamais au niveau module
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@famille.fr'

  if (!vapidPublic || !vapidPrivate) {
    console.warn('[scheduler] VAPID keys not set — push disabled')
    const recurrences = await processRecurringEntries()
    return { sent: 0, recurrences }
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  // Load all subscriptions with user prefs in one query
  const allSubs = await prisma.pushSubscription.findMany({
    include: {
      user: { include: { cerveauPreferences: true } },
    },
  })

  if (allSubs.length === 0) {
    const recurrences = await processRecurringEntries()
    return { sent: 0, recurrences }
  }

  // Group subscriptions by userId
  type UserCtx = { subs: SubRow[]; prefs: CerveauPreferences | null }
  const byUser = new Map<string, UserCtx>()
  for (const sub of allSubs) {
    if (!byUser.has(sub.userId)) {
      byUser.set(sub.userId, {
        subs:  [],
        prefs: sub.user.cerveauPreferences,
      })
    }
    byUser.get(sub.userId)!.subs.push({
      endpoint: sub.endpoint,
      p256dh:   sub.p256dh,
      auth:     sub.auth,
    })
  }

  let sent = 0

  for (const [userId, { subs, prefs }] of byUser) {
    const inQuiet = isQuietTime(now, prefs?.quietFrom ?? null, prefs?.quietUntil ?? null)

    // ── remindAt for ALL types (REMINDER + others) ────────────────
    const remindAtEntries = await prisma.cerveauEntry.findMany({
      where: {
        createdById:       userId,
        status:            'ACTIVE',
        remindAt:          { lte: now },
        notificationCount: { lt: 4 },
      },
    })

    for (const entry of remindAtEntries) {
      if (inQuiet) {
        console.log(`[scheduler] quiet time — skipped entry ${entry.id}`)
        continue
      }
      const didSend = await sendWithEscalation(entry, subs, prefs)
      if (didSend) sent += subs.length
    }

    // ── Events (advance notice per prefs.eventLeadTime) ───────────
    const leadMs = (prefs?.eventLeadTime ?? 1440) * 60 * 1000
    const inLeadTime     = new Date(now.getTime() + leadMs)
    const inLeadTimePlus = new Date(inLeadTime.getTime() + 60_000)

    const events = await prisma.cerveauEntry.findMany({
      where: {
        createdById:       userId,
        type:              'EVENT',
        status:            'ACTIVE',
        dueDate:           { gte: inLeadTime, lt: inLeadTimePlus },
        notificationCount: { lt: 1 },
      },
    })

    for (const event of events) {
      if (inQuiet) {
        console.log(`[scheduler] quiet time — skipped event ${event.id}`)
        continue
      }
      const leadLabel = prefs?.eventLeadTime === 60  ? '1h'
                      : prefs?.eventLeadTime === 120 ? '2h'
                      : prefs?.eventLeadTime === 480 ? '8h'
                      : 'demain'
      for (const sub of subs) {
        await sendPush(sub, {
          title:   event.title,
          body:    `Événement dans ${leadLabel}`,
          entryId: event.id,
          url:     '/cerveau',
        })
        sent++
      }
      await prisma.cerveauEntry.update({
        where: { id: event.id },
        data:  { notificationCount: { increment: 1 }, lastNotifiedAt: new Date() },
      })
    }

    // ── Weekly recap ──────────────────────────────────────────────
    if (!inQuiet) {
      await sendWeeklyRecap(userId, subs, prefs, now)
    }

    // ── Daily digest ──────────────────────────────────────────────
    await sendDailyDigest(userId, subs, prefs, now)
  }

  const recurrences = await processRecurringEntries()

  return { sent, recurrences }
}