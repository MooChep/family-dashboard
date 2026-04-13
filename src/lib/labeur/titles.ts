import type { Gender } from '@prisma/client'
import type { HonorTierConfig } from './types'

// ─── Configuration des paliers de titres ─────────────────────────────────────
// Basé sur totalEcuEarned (ne diminue jamais, même si le solde courant baisse)
export const HONOR_TIERS: HonorTierConfig[] = [
  { minEcu: 0,    maxEcu: 49,   titleMale: 'Serf',      titleFemale: 'Serve'       },
  { minEcu: 50,   maxEcu: 199,  titleMale: 'Valet',     titleFemale: 'Demoiselle'  },
  { minEcu: 200,  maxEcu: 499,  titleMale: 'Écuyer',    titleFemale: 'Écuyère'     },
  { minEcu: 500,  maxEcu: 999,  titleMale: 'Chevalier', titleFemale: 'Chevalière'  },
  { minEcu: 1000, maxEcu: null, titleMale: 'Seigneur',  titleFemale: 'Dame'        },
]

// ─── Calcul du titre honorifique ──────────────────────────────────────────────

/**
 * Retourne le titre correspondant à un total d'écu cumulés et un genre.
 * NEUTRAL utilise le titre masculin par défaut.
 */
export function getHonorTitle(totalEcuEarned: number, gender: Gender): string {
  const tier = HONOR_TIERS.find(
    (t) => totalEcuEarned >= t.minEcu && (t.maxEcu === null || totalEcuEarned <= t.maxEcu)
  ) ?? HONOR_TIERS[0]

  return gender === 'FEMALE' ? tier.titleFemale : tier.titleMale
}

/**
 * Retourne le seuil (totalEcuEarned) requis pour atteindre le palier suivant.
 * Retourne null si le membre est déjà au palier maximum.
 */
export function getNextTitleThreshold(totalEcuEarned: number): number | null {
  const currentIndex = HONOR_TIERS.findIndex(
    (t) => totalEcuEarned >= t.minEcu && (t.maxEcu === null || totalEcuEarned <= t.maxEcu)
  )

  const nextTier = HONOR_TIERS[currentIndex + 1]
  return nextTier ? nextTier.minEcu : null
}

/**
 * Calcule le pourcentage de progression vers le prochain palier (0–100).
 * Retourne 100 si le membre est au palier maximum.
 */
export function getTitleProgressPercent(totalEcuEarned: number): number {
  const currentIndex = HONOR_TIERS.findIndex(
    (t) => totalEcuEarned >= t.minEcu && (t.maxEcu === null || totalEcuEarned <= t.maxEcu)
  )

  const current = HONOR_TIERS[currentIndex]
  const next = HONOR_TIERS[currentIndex + 1]

  // Dernier palier : progression complète
  if (!next || current.maxEcu === null) return 100

  const range = next.minEcu - current.minEcu
  const earned = totalEcuEarned - current.minEcu

  return Math.min(100, Math.round((earned / range) * 100))
}
