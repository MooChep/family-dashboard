import { Worker, type Job } from 'bullmq'
import { type NotificationType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendPush, buildPayload } from '@/lib/cerveau/push'
import { redisConnection } from '@/lib/cerveau/queues'

// ── Types ──

interface ScanJobData {
  triggeredAt: string
}

// ── Helpers de contenu ──

/**
 * Construit titre + corps de la notification selon le type.
 * Le contenu de l'entrée est tronqué à 80 chars pour la lisibilité mobile.
 */
function buildNotificationText(
  type: NotificationType,
  entryContent: string | null,
): { title: string; body: string } {
  const content = entryContent ? entryContent.slice(0, 80) : '—'

  switch (type) {
    case 'REMINDER':
      return { title: content, body: "C'est l'heure !" }
    case 'EVENT':
      return { title: content, body: 'Votre événement approche.' }
    case 'ENRICHMENT':
      return {
        title: content,
        body: "Ajouté il y a peu — des détails à ajouter pendant que c\u2019est frais ?",
      }
    default:
      return { title: content, body: '' }
  }
}

// ── Worker ──

/**
 * Worker BullMQ pour les rappels, événements et enrichissements Discussion.
 * Traite les jobs "scan" déclenchés toutes les minutes par workers.ts.
 * Pour chaque NotificationLog dû (scheduledAt ≤ now, sentAt null), envoie le push.
 */
export const remindersWorker = new Worker(
  'cerveau-reminders',
  async (job: Job<ScanJobData>) => {
    if (job.name !== 'scan') return

    const now = new Date()

    const due = await prisma.notificationLog.findMany({
      where: {
        sentAt:      null,
        scheduledAt: { lte: now },
        type:        { in: ['REMINDER', 'EVENT', 'ENRICHMENT'] },
      },
      include: {
        entry: {
          select: {
            content:          true,
            status:           true,
            enrichNotifiedAt: true,
          },
        },
      },
    })

    for (const log of due) {
      try {
        // ── Skip si entrée terminée / archivée ──
        if (log.entry && ['DONE', 'CANCELLED', 'ARCHIVED'].includes(log.entry.status)) {
          await prisma.notificationLog.update({
            where: { id: log.id },
            data:  { sentAt: now },
          })
          continue
        }

        // ── Skip ENRICHMENT si la discussion a déjà été enrichie (dismissed) ──
        if (log.type === 'ENRICHMENT' && log.entry?.enrichNotifiedAt) {
          await prisma.notificationLog.update({
            where: { id: log.id },
            data:  { sentAt: now },
          })
          continue
        }

        const { title, body } = buildNotificationText(log.type, log.entry?.content ?? null)
        const payload = buildPayload(log.type, title, body, log.entryId)

        await sendPush(log.userId, payload)

        await prisma.notificationLog.update({
          where: { id: log.id },
          data:  { sentAt: now },
        })
      } catch (err) {
        console.error(`[worker:reminders] Notification ${log.id} échouée :`, err)
      }
    }

    if (due.length > 0) {
      console.log(`[worker:reminders] ${due.length} notification(s) traitée(s)`)
    }
  },
  { connection: redisConnection },
)

remindersWorker.on('failed', (job, err) => {
  console.error(`[worker:reminders] Job ${job?.id ?? '?'} échoué :`, err)
})
