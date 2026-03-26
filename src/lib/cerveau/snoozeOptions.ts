import type { CerveauPreferences } from '@prisma/client'

export type SnoozeSlot = {
  action:  string   // "snooze_0" | "snooze_1" | "snooze_2"
  label:   string
  minutes: number
  dynamic: boolean
}

export function resolveSnoozeSlots(
  prefs: CerveauPreferences | null,
  now:   Date = new Date(),
): SnoozeSlot[] {
  const slot1Label   = prefs?.snoozeSlot1Label   ?? '15 min'
  const slot1Minutes = prefs?.snoozeSlot1Minutes ?? 15
  const slot2Label   = prefs?.snoozeSlot2Label   ?? '1 heure'
  const slot2Minutes = prefs?.snoozeSlot2Minutes ?? 60
  const slot3Label   = prefs?.snoozeSlot3Label   ?? 'Ce soir'
  const slot3Dynamic = prefs?.snoozeSlot3Dynamic ?? true

  // Slot 3 — dynamique (prochaine soirée) ou durée fixe
  let slot3Minutes: number
  if (slot3Dynamic) {
    const [h, m] = (prefs?.eveningStartsAt ?? '19:00').split(':').map(Number)
    const tonight = new Date(now)
    tonight.setHours(h, m ?? 0, 0, 0)
    if (tonight <= now) tonight.setDate(tonight.getDate() + 1)
    slot3Minutes = Math.round((tonight.getTime() - now.getTime()) / 60_000)
  } else {
    slot3Minutes = prefs?.snoozeSlot3Minutes ?? 240
  }

  return [
    { action: 'snooze_0', label: slot1Label, minutes: slot1Minutes, dynamic: false },
    { action: 'snooze_1', label: slot2Label, minutes: slot2Minutes, dynamic: false },
    { action: 'snooze_2', label: slot3Label, minutes: slot3Minutes, dynamic: slot3Dynamic },
  ]
}

export function getDefaultSnoozeMinutes(
  prefs: CerveauPreferences | null,
  now:   Date = new Date(),
): number {
  const slots = resolveSnoozeSlots(prefs, now)
  const idx   = (prefs?.snoozeDefaultSlot ?? 2) - 1
  return slots[Math.min(idx, 2)].minutes
}
