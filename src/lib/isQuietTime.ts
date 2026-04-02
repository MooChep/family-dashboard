export function isQuietTime(
  now:        Date,
  quietFrom:  string | null,
  quietUntil: string | null,
): boolean {
  if (!quietFrom || !quietUntil) return false

  const [fromH, fromM] = quietFrom.split(':').map(Number)
  const [untilH, untilM] = quietUntil.split(':').map(Number)

  const nowMinutes   = now.getHours() * 60 + now.getMinutes()
  const fromMinutes  = fromH * 60 + fromM
  const untilMinutes = untilH * 60 + untilM

  // Overnight span (e.g. 22:00 → 08:00 crosses midnight)
  if (fromMinutes > untilMinutes) {
    return nowMinutes >= fromMinutes || nowMinutes < untilMinutes
  }

  // Same-day span (e.g. 08:00 → 22:00)
  return nowMinutes >= fromMinutes && nowMinutes < untilMinutes
}
