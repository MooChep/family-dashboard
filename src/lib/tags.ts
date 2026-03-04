/**
 * src/lib/tags.ts
 * Normalisation et déduplication des tags via distance de Levenshtein
 */

// ─── Normalisation ────────────────────────────────────────────────────────────
// "Intérêts" → "interets", "McDo" → "mcdo"

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')                        // décompose les accents
    .replace(/[\u0300-\u036f]/g, '')         // supprime les diacritiques
    .replace(/[^a-z0-9]/g, '')              // garde seulement alphanum
}

// ─── Distance de Levenshtein ──────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

// ─── Seuil adaptatif ──────────────────────────────────────────────────────────
// Tolérance proportionnelle à la longueur du mot :
//   <= 4 lettres : 0 (exact)
//   5-6 lettres  : 1
//   7+  lettres  : 2

function threshold(len: number): number {
  if (len <= 4) return 0
  if (len <= 6) return 1
  return 2
}

// ─── Résolution d'un tag contre une liste existante ──────────────────────────
// Retourne le tag existant le plus proche si dans le seuil, sinon le tag normalisé

export function resolveTag(raw: string, existingTags: string[]): string {
  const normalized = normalizeTag(raw)
  if (!normalized) return ''

  let bestMatch: string | null = null
  let bestDist = Infinity

  for (const existing of existingTags) {
    const dist = levenshtein(normalized, existing)
    const thr  = threshold(Math.max(normalized.length, existing.length))
    if (dist <= thr && dist < bestDist) {
      bestDist  = dist
      bestMatch = existing
    }
  }

  return bestMatch ?? normalized
}

// ─── Résolution d'un tableau de tags ─────────────────────────────────────────
// Déduplique aussi les tags entre eux (dans le même batch)

export function resolveTags(rawTags: string[], existingTags: string[]): string[] {
  const resolved: string[] = []
  const seen = new Set<string>(existingTags)

  for (const raw of rawTags) {
    const tag = resolveTag(raw, Array.from(seen))
    if (!tag) continue
    if (!resolved.includes(tag)) {
      resolved.push(tag)
      seen.add(tag)
    }
  }

  return resolved
}