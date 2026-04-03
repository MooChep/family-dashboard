import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/gamelle/recipes/[id]/like
 * Toggle like : like si absent, unlike si présent.
 * Like global — pas de distinction par utilisateur.
 * Returns { liked: boolean }
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recipe = await prisma.recipe.findUnique({ where: { id: params.id } })
  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

  const existing = await prisma.recipeLike.findUnique({ where: { recipeId: params.id } })

  if (existing) {
    await prisma.recipeLike.delete({ where: { recipeId: params.id } })
    return NextResponse.json({ liked: false })
  } else {
    await prisma.recipeLike.create({ data: { recipeId: params.id } })
    return NextResponse.json({ liked: true })
  }
}
