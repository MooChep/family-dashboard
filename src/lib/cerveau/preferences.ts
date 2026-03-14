import { type NotificationPreference } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ── Valeurs par défaut ──

export const DEFAULT_PREFERENCES = {
  reminderDelays:     ['PT0S', '-PT15M', '-PT1H'],
  snoozeTonightHour:  '20:00',
  eventDefaultDelays: ['-P1D', '-PT2H'],
  enrichDelay:        60,
  briefEnabled:       false,
  briefTime:          '08:00',
  recapEnabled:       false,
  recapDay:           0,
  recapTime:          '19:00',
  silenceEnabled:     false,
  silenceStart:       null,
  silenceEnd:         null,
  escalationEnabled:  false,
  escalationDelay:    30,
} as const

// ── Création automatique ──

/**
 * Retourne les préférences de l'utilisateur, ou les crée avec les valeurs
 * par défaut si c'est la première connexion au module Cerveau.
 */
export async function getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where:  { userId },
    update: {},
    create: {
      userId,
      reminderDelays:     JSON.stringify(DEFAULT_PREFERENCES.reminderDelays),
      snoozeTonightHour:  DEFAULT_PREFERENCES.snoozeTonightHour,
      eventDefaultDelays: JSON.stringify(DEFAULT_PREFERENCES.eventDefaultDelays),
      enrichDelay:        DEFAULT_PREFERENCES.enrichDelay,
      briefEnabled:       DEFAULT_PREFERENCES.briefEnabled,
      briefTime:          DEFAULT_PREFERENCES.briefTime,
      recapEnabled:       DEFAULT_PREFERENCES.recapEnabled,
      recapDay:           DEFAULT_PREFERENCES.recapDay,
      recapTime:          DEFAULT_PREFERENCES.recapTime,
      silenceEnabled:     DEFAULT_PREFERENCES.silenceEnabled,
      silenceStart:       DEFAULT_PREFERENCES.silenceStart,
      silenceEnd:         DEFAULT_PREFERENCES.silenceEnd,
      escalationEnabled:  DEFAULT_PREFERENCES.escalationEnabled,
      escalationDelay:    DEFAULT_PREFERENCES.escalationDelay,
    },
  })
}

// ── Helpers de lecture ──

/** Retourne les délais de rappel actifs sous forme de tableau. */
export function getReminderDelays(prefs: NotificationPreference): string[] {
  try { return JSON.parse(prefs.reminderDelays) as string[] }
  catch { return ['PT0S'] }
}

/** Retourne les délais événement par défaut sous forme de tableau. */
export function getEventDefaultDelays(prefs: NotificationPreference): string[] {
  try { return JSON.parse(prefs.eventDefaultDelays) as string[] }
  catch { return ['-P1D', '-PT2H'] }
}

/** Calcule la date "ce soir" à partir de snoozeTonightHour. Si l'heure est déjà passée, renvoie demain soir. */
export function getTonightTime(prefs: NotificationPreference): Date {
  const [h, m] = prefs.snoozeTonightHour.split(':').map(Number)
  const tonight = new Date()
  tonight.setHours(h, m ?? 0, 0, 0)
  if (tonight < new Date()) tonight.setDate(tonight.getDate() + 1)
  return tonight
}

/**
 * Vérifie si l'heure actuelle est dans la fenêtre de silence.
 * Supporte les fenêtres qui enjambent minuit (ex: 23:00 → 07:30).
 */
export function isInSilenceWindow(prefs: NotificationPreference): boolean {
  if (!prefs.silenceEnabled || !prefs.silenceStart || !prefs.silenceEnd) return false
  const now   = new Date()
  const hhmm  = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const start = prefs.silenceStart
  const end   = prefs.silenceEnd
  // Fenêtre qui enjambe minuit
  if (start > end) return hhmm >= start || hhmm < end
  return hhmm >= start && hhmm < end
}
