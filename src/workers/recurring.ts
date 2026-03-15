import { Worker, type Job } from 'bullmq'
import { type EntrySource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redisConnection } from '@/lib/cerveau/queues'

// ── Parsing RRULE minimal ──

interface RruleParsed {
  freq:     'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  /** Jour de la semaine ciblé (WEEKLY;BYDAY). 0=dim, 1=lun, …, 6=sam */
  byDay?:   number
}

const DAY_MAP: Record<string, number> = {
  MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0,
}

/**
 * Parse un sous-ensemble de la spec iCal RRULE.
 * Supporte FREQ, INTERVAL et BYDAY (un seul jour).
 * Retourne null si la règle est mal formée ou non supportée.
 */
function parseRrule(rule: string): RruleParsed | null {
  // Supprime le préfixe "RRULE:" si présent
  const body = rule.startsWith('RRULE:') ? rule.slice(6) : rule

  const parts: Record<string, string> = {}
  for (const part of body.split(';')) {
    const [key, val] = part.split('=')
    if (key && val) parts[key] = val
  }

  const freqMap = { DAILY: 'DAILY', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' } as const
  const freq = freqMap[parts['FREQ'] as keyof typeof freqMap]
  if (!freq) return null

  const interval = parts['INTERVAL'] ? parseInt(parts['INTERVAL'], 10) : 1
  const byDay    = parts['BYDAY'] ? DAY_MAP[parts['BYDAY']] : undefined

  return { freq, interval, byDay }
}

/**
 * Calcule la prochaine occurrence à partir d'une date de base.
 */
function nextOccurrence(from: Date, rule: RruleParsed): Date {
  const next = new Date(from)

  switch (rule.freq) {
    case 'DAILY':
      next.setDate(next.getDate() + rule.interval)
      break
    case 'WEEKLY':
      if (rule.byDay !== undefined) {
        // Avance jusqu'au prochain jour cible
        next.setDate(next.getDate() + 1)
        while (next.getDay() !== rule.byDay) {
          next.setDate(next.getDate() + 1)
        }
      } else {
        next.setDate(next.getDate() + 7 * rule.interval)
      }
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + rule.interval)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + rule.interval)
      break
  }

  return next
}

// ── Worker ──

/**
 * Worker BullMQ pour la génération d'occurrences récurrentes.
 * Traite les jobs "scan" déclenchés quotidiennement par workers.ts.
 *
 * Pour chaque entrée avec recurrenceRule et status DONE,
 * crée une nouvelle occurrence avec le prochain dueDate calculé.
 * Source = RECURRING pour traçabilité.
 */
export const recurringWorker = new Worker(
  'cerveau-recurring',
  async (job: Job) => {
    if (job.name !== 'scan') return

    const entries = await prisma.entry.findMany({
      where: {
        recurrenceRule: { not: null },
        status:         'DONE',
        dueDate:        { not: null },
      },
      select: {
        id:             true,
        recurrenceRule: true,
        dueDate:        true,
        content:        true,
        type:           true,
        authorId:       true,
        assignedTo:     true,
        priority:       true,
        projectId:      true,
      },
    })

    let created = 0

    for (const entry of entries) {
      if (!entry.recurrenceRule || !entry.dueDate) continue

      const rule = parseRrule(entry.recurrenceRule)
      if (!rule) {
        console.warn(`[worker:recurring] RRULE non supportée : ${entry.recurrenceRule}`)
        continue
      }

      const nextDue = nextOccurrence(entry.dueDate, rule)

      try {
        await prisma.$transaction([
          // Crée la prochaine occurrence
          prisma.entry.create({
            data: {
              type:           entry.type,
              content:        entry.content,
              status:         'OPEN',
              authorId:       entry.authorId,
              assignedTo:     entry.assignedTo,
              priority:       entry.priority ?? undefined,
              dueDate:        nextDue,
              recurrenceRule: entry.recurrenceRule,
              projectId:      entry.projectId ?? undefined,
              source:         'RECURRING' as EntrySource,
            },
          }),
          // Archive l'ancienne occurrence pour ne pas la retraiter
          prisma.entry.update({
            where: { id: entry.id },
            data:  { status: 'ARCHIVED', archivedAt: new Date() },
          }),
        ])

        created++
      } catch (err) {
        console.error(`[worker:recurring] Erreur sur entrée ${entry.id} :`, err)
      }
    }

    if (created > 0) {
      console.log(`[worker:recurring] ${created} occurrence(s) récurrente(s) créée(s)`)
    }
  },
  { connection: redisConnection },
)

recurringWorker.on('failed', (job, err) => {
  console.error(`[worker:recurring] Job ${job?.id ?? '?'} échoué :`, err)
})
