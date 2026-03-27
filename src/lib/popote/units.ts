import { displayFraction } from './fractions'

/** Une entrée de la table de conversions d'un ingrédient référence. */
export type Conversion = {
  label: string  // ex: "gousse", "càs", "cm"
  toBase: number // facteur vers l'unité de base (g ou ml)
}

/**
 * Formate une quantité pour l'affichage.
 * - Fractions standard (¼ ½ ¾) pour les valeurs < 1
 * - Conversion g→kg et ml→L au-delà de 1000
 * - Unité vide si non fournie (ingrédients en UNIT)
 *
 * @example formatQuantity(0.5, 'kg') → "½ kg"
 * @example formatQuantity(1500, 'g')  → "1.5kg"
 * @example formatQuantity(2, '')      → "2"
 */
export function formatQuantity(value: number, unit: string): string {
  const frac = displayFraction(value)
  if (frac !== null) return unit ? `${frac} ${unit}` : frac

  if (unit === 'ml' && value >= 1000) {
    const l = value / 1000
    return `${_stripTrailingZero(l)}L`
  }
  if (unit === 'g' && value >= 1000) {
    const kg = value / 1000
    return `${_stripTrailingZero(kg)}kg`
  }

  const display = _stripTrailingZero(value)
  return unit ? `${display} ${unit}` : display
}

/**
 * Convertit une quantité exprimée dans une unité quelconque vers l'unité
 * de base de l'ingrédient (GRAM, MILLILITER ou UNIT) en utilisant la table
 * de conversions de l'ingrédient référence.
 *
 * Retourne null si la conversion est impossible (unité inconnue, pas de table).
 *
 * @example convertToBase(2, 'gousse', [{label:'gousse', toBase:5}]) → 10
 * @example convertToBase(100, 'g', []) → 100  (g est l'unité de base)
 * @example convertToBase(1, 'càs', []) → null
 */
export function convertToBase(
  quantity: number,
  displayUnit: string,
  conversions: Conversion[],
): number | null {
  const unit = displayUnit.trim().toLowerCase()

  // Unités de base directes — déjà dans la bonne unité
  if (['g', 'gram', 'gramme', 'grammes'].includes(unit)) return quantity
  if (['ml', 'milliliter', 'millilitre'].includes(unit)) return quantity
  if (['', 'unit', 'unité', 'pièce', 'pcs'].includes(unit)) return quantity

  // cl → ml
  if (unit === 'cl') return quantity * 10

  // kg → g
  if (unit === 'kg') return quantity * 1000

  // l → ml
  if (['l', 'litre', 'liter'].includes(unit)) return quantity * 1000

  // Recherche dans la table de conversions de l'ingrédient
  const conv = conversions.find(c => c.label.toLowerCase() === unit)
  if (conv) return quantity * conv.toBase

  return null
}

/**
 * Additionne deux quantités d'un même ingrédient après conversion en unité
 * de base.
 *
 * Retourne null si les unités sont incompatibles (pas de conversion disponible
 * pour l'une ou l'autre) — dans ce cas, les deux lignes doivent rester
 * séparées dans la liste de courses avec un indicateur visuel.
 *
 * @example addQuantities(100,'g', 500,'g', []) → { quantity: 600, unit: 'g' }
 * @example addQuantities(1,'gousse', 15,'g', [{label:'gousse',toBase:5}]) → { quantity: 20, unit: 'g' }
 * @example addQuantities(1,'gousse', 15,'g', []) → null
 */
export function addQuantities(
  qA: number,
  unitA: string,
  qB: number,
  unitB: string,
  conversions: Conversion[],
): { quantity: number; unit: string } | null {
  const baseA = convertToBase(qA, unitA, conversions)
  const baseB = convertToBase(qB, unitB, conversions)

  if (baseA === null || baseB === null) return null

  // L'unité de base est celle du premier ingrédient converti
  const resultUnit = _resolveBaseUnit(unitA, conversions)
  return { quantity: baseA + baseB, unit: resultUnit }
}

/** Détermine l'unité de base après conversion (g, ml ou vide pour UNIT). */
function _resolveBaseUnit(displayUnit: string, conversions: Conversion[]): string {
  const u = displayUnit.trim().toLowerCase()
  if (['g', 'gram', 'gramme', 'grammes', 'kg'].includes(u)) return 'g'
  if (['ml', 'cl', 'l', 'litre', 'liter', 'milliliter', 'millilitre'].includes(u)) return 'ml'
  const conv = conversions.find(c => c.label.toLowerCase() === u)
  if (conv) return 'g' // les conversions pointent vers g ou ml par convention
  return ''
}

function _stripTrailingZero(n: number): string {
  return parseFloat(n.toFixed(3)).toString()
}
