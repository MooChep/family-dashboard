import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { convertToBase } from '@/lib/gamelle/units'

export type Suggestion = {
  recipe: {
    id:           string
    title:        string
    imageLocal:   string | null
    basePortions: number
  }
  level:   1 | 2
  missing: { name: string; needed: number; available: number; unit: string }[]
}

/**
 * GET /api/gamelle/suggestions
 * Retourne les recettes faisables ou presque depuis le stock actuel.
 * Niveau 1 : tous les ingrédients couverts.
 * Niveau 2 : au plus 2 ingrédients manquants.
 * Triées : niveau 1 en premier, puis par nombre de manquants ASC.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Une seule requête pour tout charger
  const [recipes, inventoryRows] = await Promise.all([
    prisma.recipe.findMany({
      select: {
        id:           true,
        title:        true,
        imageLocal:   true,
        basePortions: true,
        ingredients: {
          select: {
            quantity:        true,
            displayQuantity: true,
            displayUnit:     true,
            referenceId:     true,
            reference: {
              select: {
                name:        true,
                baseUnit:    true,
                conversions: true,
              },
            },
          },
        },
      },
    }),
    prisma.inventory.findMany({
      select: { referenceId: true, quantity: true },
    }),
  ])

  // Index inventaire par referenceId
  const stock = new Map<string, number>(
    inventoryRows.map(i => [i.referenceId, i.quantity])
  )

  const suggestions: Suggestion[] = []

  for (const recipe of recipes) {
    if (recipe.ingredients.length === 0) continue

    const missing: Suggestion['missing'] = []

    for (const ing of recipe.ingredients) {
      const available = stock.get(ing.referenceId) ?? 0

      // Convertir la quantité affichée en unité de base pour comparer avec le stock
      const conversions = (ing.reference.conversions as { label: string; toBase: number }[] | null) ?? []
      const needed      = convertToBase(ing.displayQuantity, ing.displayUnit, conversions) ?? ing.quantity

      if (available < needed) {
        missing.push({
          name:      ing.reference.name,
          needed,
          available,
          unit:      ing.reference.baseUnit,
        })
      }
    }

    if (missing.length === 0) {
      suggestions.push({ recipe, level: 1, missing: [] })
    } else if (missing.length <= 2) {
      suggestions.push({ recipe, level: 2, missing })
    }
  }

  // Tri : niveau 1 en premier, puis par nombre de manquants ASC
  suggestions.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.missing.length - b.missing.length
  })

  return NextResponse.json(suggestions)
}
