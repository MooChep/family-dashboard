import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/gamelle/recipes/liked
 * Retourne toutes les recettes likées (RecipeLike global).
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const likes = await prisma.recipeLike.findMany({
    include: {
      recipe: {
        include: {
          ingredients: {
            include: { reference: { include: { aisle: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const recipes = likes.map(l => ({
    ...l.recipe,
    steps: Array.isArray(l.recipe.steps) ? l.recipe.steps : [],
  }))

  return NextResponse.json({ success: true, data: { data: recipes, total: recipes.length, page: 1, limit: recipes.length } })
}
