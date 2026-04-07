import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/gamelle/types'

export type FeasibleRecipe = {
  id:              string
  title:           string
  imageLocal:      string
  preparationTime: number | null
  cookingTime:     number | null
  basePortions:    number
  level:           1 | 2
  missing:         string[]
}

/**
 * GET /api/gamelle/recipes/feasible
 *
 * Retourne les recettes réalisables avec le stock actuel.
 * Niveau 1 : tous les ingrédients couverts.
 * Niveau 2 : 1 ou 2 ingrédients manquants.
 * Exclut les ingrédients isIgnored et isStaple du calcul de couverture.
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const [recipes, inventory, activeSlots] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        ingredients: {
          where:   { isIgnored: false, isStaple: false },
          include: { reference: { select: { name: true } } },
        },
      },
    }),
    prisma.inventory.findMany(),
    prisma.planningSlot.findMany({
      include: {
        recipe: { include: { ingredients: { where: { isIgnored: false, isStaple: false } } } },
      },
    }),
  ])

  // Calcul des réservations (même logique que /api/gamelle/inventory)
  const reservedMap = new Map<string, number>()
  for (const slot of activeSlots) {
    const remaining = slot.portions - slot.portionsConsumed
    if (remaining <= 0) continue
    const base = slot.recipe.basePortions || 1
    for (const ing of slot.recipe.ingredients) {
      const prev = reservedMap.get(ing.referenceId) ?? 0
      reservedMap.set(ing.referenceId, prev + ing.quantity * remaining / base)
    }
  }

  // Rab Map<referenceId, rab = quantity − reserved>
  const stockMap = new Map<string, number>(
    inventory.map(i => [i.referenceId, Math.max(0, i.quantity - (reservedMap.get(i.referenceId) ?? 0))])
  )

  const result: FeasibleRecipe[] = []

  for (const recipe of recipes) {
    if (recipe.ingredients.length === 0) continue

    const missing: string[] = []

    for (const ing of recipe.ingredients) {
      const stock  = stockMap.get(ing.referenceId) ?? 0
      const needed = ing.quantity   // déjà en unité de base
      if (stock < needed) {
        missing.push(ing.reference.name)
      }
    }

    if (missing.length === 0) {
      result.push({ id: recipe.id, title: recipe.title, imageLocal: recipe.imageLocal, preparationTime: recipe.preparationTime, cookingTime: recipe.cookingTime, basePortions: recipe.basePortions, level: 1, missing: [] })
    } else if (missing.length <= 2) {
      result.push({ id: recipe.id, title: recipe.title, imageLocal: recipe.imageLocal, preparationTime: recipe.preparationTime, cookingTime: recipe.cookingTime, basePortions: recipe.basePortions, level: 2, missing })
    }
  }

  // Niveau 1 en premier, puis niveau 2
  result.sort((a, b) => a.level - b.level)

  return Response.json({ success: true, data: result } satisfies ApiResponse<FeasibleRecipe[]>)
}
