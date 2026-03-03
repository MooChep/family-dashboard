// Retourne les indices d'une période dans un tableau de mois ISO trié
export function getPeriodRange(
  allMonths: string[],
  period: { type: 'preset'; value: number } | { type: 'custom'; from: string; to: string },
): { start: number; end: number } {
  if (period.type === 'preset') {
    const end = allMonths.length - 1
    const start = Math.max(0, end - period.value + 1)
    return { start, end }
  }
  const start = allMonths.indexOf(period.from)
  const end = allMonths.indexOf(period.to)
  return { start: Math.max(start, 0), end: Math.min(end, allMonths.length - 1) }
}

// Formate une Date en "YYYY-MM"
export function toYearMonth(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}