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

type PushPayload = {
  title:    string
  body:     string
  entryId?: string
  url:      string
}

type SubRow = {
  endpoint: string
  p256dh:   string
  auth:     string
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@famille.fr',
  process.env.VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

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

// Escalation schedule:
//   count 0 → first send
//   count 1 → resend after 30 min
//   count 2 → resend after 60 min
//   count 3 → final urgent send (⚠️ prefix), then stop
//   count ≥ 4 → never send again
async function sendWithEscalation(entry: CerveauEntry, subs: SubRow[]): Promise<boolean> {
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

  const body = count >= 1
    ? `Rappel ${count + 1} — ${formatAbsolute(entry.remindAt ?? new Date())}`
    : formatAbsolute(entry.remindAt ?? new Date())

  for (const sub of subs) {
    await sendPush(sub, { title, body, entryId: entry.id, url: '/cerveau' })
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
  // Only on Sunday between 19:00 and 20:00
  if (now.getDay() !== 0) return
  if (now.getHours() < 19 || now.getHours() >= 20) return

  // Feature toggle
  if (prefs?.weeklyRecapEnabled === false) return

  // Anti double-send
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

  // Window: ±5 minutes around configured time
  if (Math.abs(nowMinutes - scheduledMinutes) > 5) return

  // Anti double-send (guard against multiple cron fires in same window)
  if (prefs?.lastDailyDigestAt) {
    const hoursSince = (now.getTime() - prefs.lastDailyDigestAt.getTime()) / 3_600_000
    if (hoursSince < 20) return
  }

  // Respect quiet hours
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

  // Nothing to report → skip
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

  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in25h = new Date(in24h.getTime() + 60 * 1000)

  let sent = 0

  for (const [userId, { subs, prefs }] of byUser) {
    const inQuiet = isQuietTime(now, prefs?.quietFrom ?? null, prefs?.quietUntil ?? null)

    // ── Reminders with escalation ─────────────────────────────────
    const reminders = await prisma.cerveauEntry.findMany({
      where: {
        createdById:       userId,
        type:              'REMINDER',
        status:            'ACTIVE',
        remindAt:          { lte: now },
        notificationCount: { lt: 4 },
      },
    })

    for (const entry of reminders) {
      if (inQuiet) {
        console.log(`[scheduler] quiet time — skipped reminder ${entry.id}`)
        continue
      }
      const didSend = await sendWithEscalation(entry, subs)
      if (didSend) sent += subs.length
    }

    // ── Events (24h advance notice) ───────────────────────────────
    const events = await prisma.cerveauEntry.findMany({
      where: {
        createdById: userId,
        type:        'EVENT',
        status:      'ACTIVE',
        dueDate:     { gte: in24h, lt: in25h },
      },
    })

    for (const event of events) {
      if (inQuiet) {
        console.log(`[scheduler] quiet time — skipped event ${event.id}`)
        continue
      }
      for (const sub of subs) {
        await sendPush(sub, {
          title:   event.title,
          body:    'Événement dans 24h',
          entryId: event.id,
          url:     '/cerveau',
        })
        sent++
      }
    }

    // ── Weekly recap ──────────────────────────────────────────────
    if (!inQuiet) {
      await sendWeeklyRecap(userId, subs, prefs, now)
    }

    // ── Daily digest ──────────────────────────────────────────────
    await sendDailyDigest(userId, subs, prefs, now)  // digest checks quiet internally
  }

  const recurrences = await processRecurringEntries()

  return { sent, recurrences }
}
