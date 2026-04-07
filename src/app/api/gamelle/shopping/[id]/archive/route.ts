import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/gamelle/shopping/[id]/archive
 * Passe la liste de ACTIVE à ARCHIVED (courses terminées).
 * Les PlanningSlots liés ne sont PAS consommés automatiquement.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await prisma.shoppingList.findUnique({ where: { id: params.id } })
  if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  if (list.status === 'ARCHIVED') return NextResponse.json({ error: 'Liste déjà archivée' }, { status: 409 })

  const updated = await prisma.shoppingList.update({
    where: { id: params.id },
    data:  { status: 'ARCHIVED', archivedAt: new Date() },
  })

  // Marquer lastPurchasedAt sur tous les slots des recettes de cette liste
  const listRecipes = await prisma.shoppingListRecipe.findMany({
    where:  { shoppingListId: params.id },
    select: { recipeId: true },
  })
  const recipeIds = listRecipes.map(r => r.recipeId)
  if (recipeIds.length > 0) {
    await prisma.planningSlot.updateMany({
      where: { recipeId: { in: recipeIds } },
      data:  { lastPurchasedAt: new Date() },
    })
  }

  return NextResponse.json(updated)
}
