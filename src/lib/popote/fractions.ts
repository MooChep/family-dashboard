/**
 * Utilitaires d'affichage et de parsing des fractions courantes.
 * Utilisé pour l'affichage des quantités en mode cuisine et dans les fiches recettes.
 */

const FRACTION_DISPLAY: Record<number, string> = {
  0.25: '¼',
  0.5:  '½',
  0.75: '¾',
  0.33: '⅓',
  0.67: '⅔',
}

/**
 * Retourne le symbole unicode de fraction si la valeur correspond,
 * sinon null.
 *
 * @example displayFraction(0.5) → "½"
 * @example displayFraction(1.5) → null
 */
export function displayFraction(value: number): string | null {
  return FRACTION_DISPLAY[value] ?? null
}

/**
 * Parse une chaîne contenant une fraction (unicode ou slash) et retourne
 * sa valeur numérique.
 *
 * @example parseFraction('½')  → 0.5
 * @example parseFraction('1/4') → 0.25
 * @example parseFraction('2')  → 2
 * @example parseFraction('1 ½') → 1.5
 */
export function parseFraction(input: string): number {
  const trimmed = input.trim()

  // Substitution des symboles unicode → valeurs
  const unicodeMap: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
  }

  // Remplace les symboles unicode dans la chaîne par leur valeur décimale
  let normalized = trimmed
  for (const [symbol, value] of Object.entries(unicodeMap)) {
    normalized = normalized.replace(symbol, ` ${value}`)
  }
  normalized = normalized.trim()

  // Cas "entier fraction" : ex "1 0.5" ou "1 1/2"
  const parts = normalized.split(/\s+/)
  if (parts.length === 2) {
    const a = _parseSimple(parts[0])
    const b = _parseSimple(parts[1])
    if (!isNaN(a) && !isNaN(b)) return a + b
  }

  return _parseSimple(normalized)
}

/** Parse un nombre ou une fraction slash (ex "3/4"). */
function _parseSimple(s: string): number {
  if (s.includes('/')) {
    const [num, den] = s.split('/')
    const n = parseFloat(num)
    const d = parseFloat(den)
    return isNaN(n) || isNaN(d) || d === 0 ? NaN : n / d
  }
  return parseFloat(s)
}
