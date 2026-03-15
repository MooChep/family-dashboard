import { Queue } from 'bullmq'

// ── Connexion Redis ──

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

/** Parse une URL Redis en options BullMQ-compatibles. */
function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url)
  return {
    host:     parsed.hostname,
    port:     parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  }
}

export const redisConnection = {
  ...parseRedisUrl(REDIS_URL),
  enableReadyCheck:    false,
  maxRetriesPerRequest: null,
}

const connection = redisConnection

// ── Queues BullMQ ──

/** Queue de rappels : Rappels, Événements, Enrichissement Discussion. */
export const remindersQueue = new Queue('cerveau-reminders', { connection })

/** Queue de brief matinal (dormant v1). */
export const briefQueue = new Queue('cerveau-brief', { connection })

/** Queue de récapitulatif hebdomadaire (dormant v1). */
export const recapQueue = new Queue('cerveau-recap', { connection })

/** Queue d'escalade de rappels non traités (dormant v1). */
export const escalationQueue = new Queue('cerveau-escalation', { connection })

/** Queue de génération d'occurrences récurrentes. */
export const recurringQueue = new Queue('cerveau-recurring', { connection })
