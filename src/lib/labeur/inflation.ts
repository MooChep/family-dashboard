// ─── Calculs d'inflation du Marché ───────────────────────────────────────────
//
// Principe : chaque tâche récurrente en retard contribue à l'inflation globale.
// Contribution d'une tâche = ecuValue × inflationContribRate × daysOverdue
// L'inflation globale = somme des contributions, plafonnée à inflationCap.
//
// Exemple (§7.1) :
//   Vaisselle (2 écu, rate=0.01, 3j retard)  → 2 × 0.01 × 3 = 0.06 → 6 %
//   Poubelles (5 écu, rate=0.01, 2j retard)  → 5 × 0.01 × 2 = 0.10 → 10 %
//   Total = 16 %

/**
 * Calcule la contribution d'une seule tâche à l'inflation (en %).
 * Retourne 0 si la tâche n'est pas en retard.
 */
export function computeInflationContrib(
  ecuValue: number,
  daysOverdue: number,
  inflationContribRate: number
): number {
  if (daysOverdue <= 0) return 0
  // Résultat en % : ecuValue × rate × jours × 100
  // (rate = 0.01 → 1 % par écu par jour, soit ecuValue/100 par jour)
  return ecuValue * inflationContribRate * daysOverdue * 100
}

/**
 * Additionne les contributions de toutes les tâches en retard (sans plafond).
 */
export function sumInflation(entries: { inflationPercent: number }[]): number {
  return entries.reduce((acc, e) => acc + e.inflationPercent, 0)
}

/**
 * Applique le plafond global d'inflation.
 * Le résultat ne peut jamais dépasser inflationCap (défaut : 150 %).
 */
export function applyInflationCap(total: number, inflationCap: number): number {
  return Math.min(total, inflationCap)
}

/**
 * Applique l'inflation à un prix en écu pour obtenir le prix affiché.
 * Le résultat est arrondi au supérieur pour rester en écu entiers.
 *
 * Exemple : prix=30, inflation=16 % → Math.ceil(30 × 1.16) = 35 écu
 */
export function applyInflationToPrice(ecuPrice: number, inflationPercent: number): number {
  if (inflationPercent <= 0) return ecuPrice
  return Math.ceil(ecuPrice * (1 + inflationPercent / 100))
}

/**
 * Détermine si la malédiction est active (inflation ≥ curseSeuil).
 */
export function isCursed(inflationPercent: number, curseSeuil: number): boolean {
  return inflationPercent >= curseSeuil
}

/**
 * Détermine si l'alerte push inflation doit être déclenchée.
 */
export function isAboveAlert(inflationPercent: number, alertThreshold: number): boolean {
  return inflationPercent >= alertThreshold
}
