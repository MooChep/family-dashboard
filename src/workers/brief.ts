import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/cerveau/queues'

/**
 * Worker BullMQ pour le brief matinal — dormant v1.
 * Sera actif en phase 2 : agrège rappels du jour, todos en retard,
 * événements du jour et discussions urgentes, puis envoie un push résumé.
 */
export const briefWorker = new Worker(
  'cerveau-brief',
  async () => {
    console.log('[worker:brief] dormant v1 — aucun traitement')
  },
  { connection: redisConnection },
)

briefWorker.on('failed', (job, err) => {
  console.error(`[worker:brief] Job ${job?.id ?? '?'} échoué :`, err)
})
