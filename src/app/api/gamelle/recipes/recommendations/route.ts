import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/gamelle/types'

export type RecommendedRecipe = {
  id:              string
  title:           string
  imageLocal:      string
  preparationTime: number | null
  cookingTime:     number | null
  basePortions:    number
  reason:          'never_cooked' | 'rarely_cooked' | 'few_portions'
}

/**
 * GET /api/gamelle/recipes/recommendations?limit=6
 *
 * Tri par priorité :
 * 1. Jamais ajoutées au menu (aucun PlanningSlot)
 * 2. Non cuisinées depuis le plus longtemps (MAX(addedAt) le plus ancien)
 * 3. Moins de portionsConsumed total
 */
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? '6'), 20)

  const recipes = await prisma.recipe.findMany({
    select: {
      id:              true,
      title:           true,
      imageLocal:      true,
      preparationTime: true,
      cookingTime:     true,
      basePortions:    true,
      planningSlots:   {
        select: { addedAt: true, portionsConsumed: true },
      },
    },
  })

  const sorted = recipes.sort((a, b) => {
    const aHasSlots = a.planningSlots.length > 0
    const bHasSlots = b.planningSlots.length > 0

    // 1. Recettes sans aucun slot en premier
    if (aHasSlots !== bHasSlots) return aHasSlots ? 1 : -1

    // 2. Oldest last-added (MAX addedAt ascending)
    const aLast = aHasSlots ? Math.max(...a.planningSlots.map(s => s.addedAt.getTime())) : 0
    const bLast = bHasSlots ? Math.max(...b.planningSlots.map(s => s.addedAt.getTime())) : 0
    if (aLast !== bLast) return aLast - bLast

    // 3. Fewest total portionsConsumed
    const aPortions = a.planningSlots.reduce((s, p) => s + p.portionsConsumed, 0)
    const bPortions = b.planningSlots.reduce((s, p) => s + p.portionsConsumed, 0)
    return aPortions - bPortions
  })

  const sliced = sorted.slice(0, limit)

  const result: RecommendedRecipe[] = sliced.map(r => {
    let reason: RecommendedRecipe['reason']
    const portionsConsumed = r.planningSlots.reduce((s, p) => s + p.portionsConsumed, 0)
    if (r.planningSlots.length === 0) {
      reason = 'never_cooked'
    } else if (portionsConsumed < 4) {
      reason = 'rarely_cooked'
    } else {
      reason = 'few_portions'
    }
    return {
      id:              r.id,
      title:           r.title,
      imageLocal:      r.imageLocal,
      preparationTime: r.preparationTime,
      cookingTime:     r.cookingTime,
      basePortions:    r.basePortions,
      reason,
    }
  })

  return Response.json({ success: true, data: result } satisfies ApiResponse<RecommendedRecipe[]>)
}
