import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { LabeurTaskFrequency } from '@prisma/client'

// ─── Helpers de gestion du fuseau horaire ─────────────────────────────────────
//
// Toutes les dates sont stockées en UTC dans MariaDB.
// Les échéances sont interprétées en Europe/Paris côté serveur.
// Un « nouveau jour » commence à minuit heure locale.

/**
 * Retourne la date d'aujourd'hui à minuit en heure locale (exprimée en UTC).
 * Utilisé pour déterminer si une tâche est due « aujourd'hui ».
 */
export function getTodayInTZ(tz: string): Date {
  const nowInTZ = toZonedTime(new Date(), tz)
  // On remet à minuit dans le fuseau local, puis on reconvertit en UTC
  const midnightLocal = new Date(
    nowInTZ.getFullYear(),
    nowInTZ.getMonth(),
    nowInTZ.getDate(),
    0, 0, 0, 0
  )
  return fromZonedTime(midnightLocal, tz)
}

/**
 * Retourne demain à minuit heure locale (exprimée en UTC).
 */
export function getTomorrowInTZ(tz: string): Date {
  const today = getTodayInTZ(tz)
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return tomorrow
}

/**
 * Retourne true si nextDueAt est strictement avant minuit aujourd'hui (heure locale).
 * Une tâche est en retard dès le lendemain de son échéance.
 */
export function isOverdue(nextDueAt: Date, tz: string): boolean {
  return nextDueAt < getTodayInTZ(tz)
}

/**
 * Retourne true si nextDueAt est entre minuit aujourd'hui et minuit demain (heure locale).
 */
export function isDueToday(nextDueAt: Date, tz: string): boolean {
  const today = getTodayInTZ(tz)
  const tomorrow = getTomorrowInTZ(tz)
  return nextDueAt >= today && nextDueAt < tomorrow
}

/**
 * Calcule le nombre de jours de retard entiers par rapport à aujourd'hui.
 * Retourne 0 si la tâche est à l'heure ou en avance.
 */
export function daysOverdue(nextDueAt: Date, tz: string): number {
  const today = getTodayInTZ(tz)
  if (nextDueAt >= today) return 0
  const diffMs = today.getTime() - nextDueAt.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calcule la prochaine échéance d'une tâche récurrente.
 *
 * Pour éviter les dérives (ex. une tâche toujours faite en retard qui
 * décale l'échéance indéfiniment), on calcule depuis fromDate si fromDate
 * est dans le futur, sinon depuis aujourd'hui.
 *
 * @param frequency      Fréquence de récurrence
 * @param intervalDays   Nombre de jours si CUSTOM
 * @param fromDate       Date de référence (généralement nextDueAt précédente)
 * @param tz             Fuseau horaire du foyer
 */
export function computeNextDueAt(
  frequency: LabeurTaskFrequency,
  intervalDays: number | null | undefined,
  fromDate: Date,
  tz: string
): Date {
  // On part de la date de référence ou d'aujourd'hui si elle est déjà passée
  const today = getTodayInTZ(tz)
  const base = fromDate > today ? fromDate : today

  const next = new Date(base)

  switch (frequency) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + 1)
      break
    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + 7)
      break
    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + 1)
      break
    case 'CUSTOM': {
      const days = intervalDays ?? 7 // fallback sécurisé
      next.setUTCDate(next.getUTCDate() + days)
      break
    }
  }

  return next
}

/**
 * Formate une date UTC en chaîne lisible dans le fuseau local (pour les logs/notifications).
 * Ex : "lundi 14 avril 2026 à 08:00"
 */
export function formatInTZ(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
