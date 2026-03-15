import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/cerveau/queues'

/**
 * Worker BullMQ pour le géofencing — dormant phases 1 et 2.
 * Sera actif en phase 3 : déclenche des notifications lors de l'entrée
 * ou sortie d'un lieu défini dans le modèle Place.
 */
export const geofenceWorker = new Worker(
  'cerveau-geofence',
  async () => {
    console.log('[worker:geofence] dormant — aucun traitement')
  },
  { connection: redisConnection },
)

geofenceWorker.on('failed', (job, err) => {
  console.error(`[worker:geofence] Job ${job?.id ?? '?'} échoué :`, err)
})
