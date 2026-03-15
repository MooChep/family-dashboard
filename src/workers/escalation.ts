import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/cerveau/queues'

/**
 * Worker BullMQ pour l'escalade de rappels non traités — dormant v1.
 * Sera actif en phase 2 : renvoie une notification avec fréquence croissante
 * si un Rappel reste OPEN ou SNOOZED après NotificationPreference.escalationDelay.
 */
export const escalationWorker = new Worker(
  'cerveau-escalation',
  async () => {
    console.log('[worker:escalation] dormant v1 — aucun traitement')
  },
  { connection: redisConnection },
)

escalationWorker.on('failed', (job, err) => {
  console.error(`[worker:escalation] Job ${job?.id ?? '?'} échoué :`, err)
})
