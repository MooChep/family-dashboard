import { remindersQueue, recurringQueue } from '@/lib/cerveau/queues'

// ── Singleton guard ──
// Les workers sont des connexions Redis persistantes — on ne les initialise
// qu'une seule fois par process, même si le module est importé plusieurs fois.
let initialized = false

/**
 * Initialise tous les workers BullMQ et planifie les jobs répétitifs.
 * Doit être appelé au démarrage du serveur (importé dans cerveau/layout.tsx).
 *
 * - reminders: scan toutes les minutes (notifications dues)
 * - recurring: scan quotidien (génération occurrences récurrentes)
 * - brief/recap/escalation/geofence: dormants v1, workers créés sans jobs
 */
export function initWorkers(): void {
  if (initialized) return
  initialized = true

  // Import dynamique pour ne pas bloquer le module côté edge/build
  // Les workers s'initialisent dès l'import de leurs modules
  void import('@/workers/reminders')
  void import('@/workers/recurring')
  void import('@/workers/brief')
  void import('@/workers/recap')
  void import('@/workers/escalation')
  void import('@/workers/geofence')

  // ── Jobs répétitifs ──

  // Scan des notifications dues : toutes les 60 secondes
  void remindersQueue.add(
    'scan',
    { triggeredAt: new Date().toISOString() },
    {
      repeat:    { every: 60_000 },
      // jobId stable → BullMQ déduplique les jobs répétitifs au redémarrage
      jobId:     'reminders:scan:repeat',
      removeOnComplete: { count: 10 },
      removeOnFail:     { count: 20 },
    },
  )

  // Scan des entrées récurrentes : toutes les 6 heures
  void recurringQueue.add(
    'scan',
    {},
    {
      repeat:    { every: 6 * 60 * 60_000 },
      jobId:     'recurring:scan:repeat',
      removeOnComplete: { count: 5 },
      removeOnFail:     { count: 10 },
    },
  )

  console.log('[workers] Initialisés : reminders (60s), recurring (6h), brief/recap/escalation/geofence (dormants)')
}
