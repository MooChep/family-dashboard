import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/popote/types'

// POST /api/popote/ingredients/[id]/merge
// body: { targetId: string }
// Fusionne l'ingrédient source ([id]) dans l'ingrédient cible (targetId) :
//   1. Redirige toutes les RecipeIngredient vers targetId
//   2. Supprime le stock Inventory du source (la cible conserve le sien)
//   3. Supprime l'ingrédient source
// Opération atomique — irréversible, confirmation côté client requise.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: { targetId?: string }
  try {
    body = await request.json() as { targetId?: string }
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  const sourceId = params.id
  const targetId = body.targetId?.trim() ?? ''

  if (!targetId) {
    return Response.json({ success: false, error: 'targetId est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (sourceId === targetId) {
    return Response.json({ success: false, error: 'Source et cible identiques' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    // Vérifier que les deux ingrédients existent
    const [source, target] = await Promise.all([
      prisma.ingredientReference.findUnique({ where: { id: sourceId }, select: { id: true, name: true } }),
      prisma.ingredientReference.findUnique({ where: { id: targetId }, select: { id: true, name: true } }),
    ])

    if (!source) {
      return Response.json({ success: false, error: 'Ingrédient source introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }
    if (!target) {
      return Response.json({ success: false, error: 'Ingrédient cible introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    await prisma.$transaction([
      // 1. Réaffecter toutes les RecipeIngredient du source vers la cible
      prisma.recipeIngredient.updateMany({
        where: { referenceId: sourceId },
        data:  { referenceId: targetId },
      }),
      // 2. Supprimer le stock Inventory du source
      prisma.inventory.deleteMany({ where: { referenceId: sourceId } }),
      // 3. Supprimer l'ingrédient source
      prisma.ingredientReference.delete({ where: { id: sourceId } }),
    ])

    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[popote/ingredients/:id/merge POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
