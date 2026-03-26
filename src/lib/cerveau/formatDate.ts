export function formatRelative(date: Date): string {
  const rtf     = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
  const diff    = date.getTime() - Date.now()
  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(seconds / 60)
  const hours   = Math.round(minutes / 60)
  const days    = Math.round(hours / 24)

  if (Math.abs(days)    >= 1) return rtf.format(days,    'day')
  if (Math.abs(hours)   >= 1) return rtf.format(hours,   'hour')
  if (Math.abs(minutes) >= 1) return rtf.format(minutes, 'minute')
  return rtf.format(seconds, 'second')
}

export function formatAbsolute(date: Date, showTime = true): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    ...(showTime && { hour: '2-digit', minute: '2-digit' }),
  }
  return new Intl.DateTimeFormat('fr-FR', options)
    .format(date)
    .replace(/^./, c => c.toUpperCase())
}

export function formatCountdown(date: Date): string {
  const now    = new Date()
  const today  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (diffDays ===  0) return "Aujourd'hui"
  if (diffDays ===  1) return 'Demain'
  if (diffDays === -1) return 'Hier'

  return new Intl.RelativeTimeFormat('fr-FR', { numeric: 'always' }).format(diffDays, 'day')
}

export function formatDateFR(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  }).format(date)
}

export function formatDateLongFR(date = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  }).format(date).replace(/^./, c => c.toUpperCase())
}
