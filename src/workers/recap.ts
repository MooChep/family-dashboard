import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/cerveau/queues'

/**
 * Worker BullMQ pour le récapitulatif hebdomadaire — dormant v1.
 * Sera actif en phase 2 : génère un résumé de la semaine (todos complétés,
 * discussions tenues, événements passés, rappels non traités) et envoie un push.
 */
export const recapWorker = new Worker(
  'cerveau-recap',
  async () => {
    console.log('[worker:recap] dormant v1 — aucun traitement')
  },
  { connection: redisConnection },
)

recapWorker.on('failed', (job, err) => {
  console.error(`[worker:recap] Job ${job?.id ?? '?'} échoué :`, err)
})
