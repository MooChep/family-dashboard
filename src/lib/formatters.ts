// Formate un montant en euros : 1234.56 → "1 234,56 €"
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formate un pourcentage : 42.5 → "42,5 %"
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

// Formate un mois ISO en label lisible : "2026-02" → "Février 2026"
export function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}