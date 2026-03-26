import { normalize } from '@/lib/cerveau/normalize'
import type { EntryWithRelations } from '@/lib/cerveau/types'

// ── Types ──────────────────────────────────────────────────────────────────

export type MatchLevel = 'exact' | 'fuzzy' | 'anagram'

export type MatchRange = { start: number; end: number }

export type SearchResult = {
  entry: EntryWithRelations
  level: MatchLevel
  /** Highlight ranges in the original title string */
  titleRanges?: MatchRange[]
  score: number
}

// ── Match functions ────────────────────────────────────────────────────────

/**
 * Exact: normalized query is a substring of normalized text.
 * Positions map 1-to-1 to the original string (NFD decomposition
 * then stripping of combining chars preserves base-char positions).
 */
function exactMatch(text: string, normQuery: string): MatchRange[] | null {
  const normText = normalize(text)
  const idx = normText.indexOf(normQuery)
  if (idx === -1) return null
  return [{ start: idx, end: idx + normQuery.length }]
}

/**
 * Fuzzy: each character of query appears in order in text (subsequence).
 * e.g. "remdr" matches "reminder"
 */
function fuzzyMatch(text: string, normQuery: string): MatchRange[] | null {
  const normText = normalize(text)
  const positions: number[] = []
  let textIdx = 0
  for (const ch of normQuery) {
    const found = normText.indexOf(ch, textIdx)
    if (found === -1) return null
    positions.push(found)
    textIdx = found + 1
  }
  return positions.map(p => ({ start: p, end: p + 1 }))
}

/**
 * Anagram: all characters of query exist somewhere in text (unordered).
 * e.g. "idremenr" → "reminder" (handles transpositions/scrambles)
 */
function anagramMatch(text: string, normQuery: string): MatchRange[] | null {
  const normText = normalize(text)
  const pool = normText.split('')
  const positions: number[] = []
  for (const ch of normQuery) {
    const idx = pool.indexOf(ch)
    if (idx === -1) return null
    positions.push(idx)
    pool[idx] = '\0' // consume
  }
  return positions
    .sort((a, b) => a - b)
    .map(p => ({ start: p, end: p + 1 }))
}

// ── Score helpers ──────────────────────────────────────────────────────────

const LEVEL_BASE: Record<MatchLevel, number> = {
  exact: 100,
  fuzzy: 50,
  anagram: 20,
}

function levelRank(a: MatchLevel, b: MatchLevel): MatchLevel {
  return LEVEL_BASE[a] >= LEVEL_BASE[b] ? a : b
}

// ── Main search function ───────────────────────────────────────────────────

export function searchEntries(
  entries: EntryWithRelations[],
  query: string,
): SearchResult[] {
  const q = normalize(query)
  if (q.length < 1) return []

  const results: SearchResult[] = []

  for (const entry of entries) {
    let bestLevel: MatchLevel | null = null
    let titleRanges: MatchRange[] | undefined
    let score = 0

    // ── Title (weight ×3) ────────────────────────────────────────────────
    const tExact = exactMatch(entry.title, q)
    if (tExact) {
      bestLevel = 'exact'
      titleRanges = tExact
      score = LEVEL_BASE.exact * 3
    } else {
      const tFuzzy = fuzzyMatch(entry.title, q)
      if (tFuzzy) {
        bestLevel = 'fuzzy'
        titleRanges = tFuzzy
        score = LEVEL_BASE.fuzzy * 3
      } else {
        const tAnagram = anagramMatch(entry.title, q)
        if (tAnagram) {
          bestLevel = 'anagram'
          titleRanges = tAnagram
          score = LEVEL_BASE.anagram * 3
        }
      }
    }

    // ── Body (weight ×2) ─────────────────────────────────────────────────
    if (entry.body && bestLevel !== 'exact') {
      const b = entry.body
      if (exactMatch(b, q)) {
        bestLevel = levelRank(bestLevel ?? 'anagram', 'exact')
        score = Math.max(score, LEVEL_BASE.exact * 2)
      } else if (fuzzyMatch(b, q)) {
        const candidate = levelRank(bestLevel ?? 'anagram', 'fuzzy')
        if (LEVEL_BASE[candidate] > LEVEL_BASE[bestLevel ?? 'anagram']) {
          bestLevel = candidate
          score = Math.max(score, LEVEL_BASE.fuzzy * 2)
        }
      } else if (!bestLevel && anagramMatch(b, q)) {
        bestLevel = 'anagram'
        score = Math.max(score, LEVEL_BASE.anagram * 2)
      }
    }

    // ── Tags (weight ×2) ─────────────────────────────────────────────────
    if (entry.tags.length > 0 && bestLevel !== 'exact') {
      const tagsText = entry.tags.join(' ')
      if (exactMatch(tagsText, q)) {
        bestLevel = levelRank(bestLevel ?? 'anagram', 'exact')
        score = Math.max(score, LEVEL_BASE.exact * 2)
      } else if (fuzzyMatch(tagsText, q)) {
        const candidate = levelRank(bestLevel ?? 'anagram', 'fuzzy')
        if (LEVEL_BASE[candidate] > LEVEL_BASE[bestLevel ?? 'anagram']) {
          bestLevel = candidate
          score = Math.max(score, LEVEL_BASE.fuzzy * 2)
        }
      } else if (!bestLevel && anagramMatch(tagsText, q)) {
        bestLevel = 'anagram'
        score = Math.max(score, LEVEL_BASE.anagram * 2)
      }
    }

    // ── List items (weight ×1) ───────────────────────────────────────────
    if (entry.listItems.length > 0 && bestLevel !== 'exact') {
      const itemsText = entry.listItems.map(i => i.label).join(' ')
      if (exactMatch(itemsText, q)) {
        bestLevel = levelRank(bestLevel ?? 'anagram', 'exact')
        score = Math.max(score, LEVEL_BASE.exact)
      } else if (!bestLevel && fuzzyMatch(itemsText, q)) {
        bestLevel = 'fuzzy'
        score = Math.max(score, LEVEL_BASE.fuzzy)
      } else if (!bestLevel && anagramMatch(itemsText, q)) {
        bestLevel = 'anagram'
        score = Math.max(score, LEVEL_BASE.anagram)
      }
    }

    if (bestLevel) {
      results.push({ entry, level: bestLevel, titleRanges, score })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}
