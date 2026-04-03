import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type GamelleStats = {
  totalRecipes:           number
  recipesCooked:          number
  mostCookedRecipes:      { recipe: { id: string; title: string; imageLocal: string | null }; count: number }[]
  shoppingListsCompleted: number
  itemsPurchased:         number
  portionsConsumedTotal:  number
  slotsActive:            number
  since:                  string | null
}

/**
 * GET /api/gamelle/stats
 * Statistiques lifetime du module Gamelle.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    totalRecipes,
    slotsAll,
    shoppingListsCompleted,
    itemsPurchased,
    firstSlot,
  ] = await Promise.all([
    prisma.recipe.count(),
    prisma.planningSlot.findMany({
      select: {
        recipeId:         true,
        portionsConsumed: true,
        portions:         true,
        addedAt:          true,
        recipe: { select: { id: true, title: true, imageLocal: true } },
      },
    }),
    prisma.shoppingList.count({ where: { status: 'ARCHIVED' } }),
    prisma.shoppingListItem.count({ where: { purchased: true } }),
    prisma.planningSlot.findFirst({ orderBy: { addedAt: 'asc' }, select: { addedAt: true } }),
  ])

  // Recettes cuisinées (au moins une fois)
  const cookedSlots    = slotsAll.filter(s => s.portionsConsumed > 0)
  const recipesCooked  = new Set(cookedSlots.map(s => s.recipeId)).size

  // Top 5 recettes cuisinées — compte par recipeId
  const countByRecipe  = new Map<string, { recipe: GamelleStats['mostCookedRecipes'][number]['recipe']; count: number }>()
  for (const s of cookedSlots) {
    const existing = countByRecipe.get(s.recipeId)
    if (existing) {
      existing.count += s.portionsConsumed
    } else {
      countByRecipe.set(s.recipeId, { recipe: s.recipe, count: s.portionsConsumed })
    }
  }
  const mostCookedRecipes = Array.from(countByRecipe.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Portions consommées total
  const portionsConsumedTotal = slotsAll.reduce((sum, s) => sum + s.portionsConsumed, 0)

  // Slots actifs (portions restantes)
  const slotsActive = slotsAll.filter(s => s.portionsConsumed < s.portions).length

  const stats: GamelleStats = {
    totalRecipes,
    recipesCooked,
    mostCookedRecipes,
    shoppingListsCompleted,
    itemsPurchased,
    portionsConsumedTotal,
    slotsActive,
    since: firstSlot?.addedAt.toISOString() ?? null,
  }

  return NextResponse.json(stats)
}
