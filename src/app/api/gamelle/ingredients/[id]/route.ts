import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/gamelle/types'
import type { BaseUnit } from '@prisma/client'
import type { IngredientWithAisle } from '../route'

type UpdateIngredientPayload = {
  name?:               string
  baseUnit?:           BaseUnit
  aisleId?:            string
  defaultQuantity?:    number | null
  conversions?:        unknown
  quickBuyQuantities?: unknown
  imageUrl?:           string | null
}

/** Recettes bloquant la suppression d'un ingrédient. */
type BlockingRecipe = { id: string; title: string }

// PATCH /api/gamelle/ingredients/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: UpdateIngredientPayload
  try {
    body = await request.json() as UpdateIngredientPayload
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    // Construction explicite pour satisfaire le typage Prisma
    const updateData: Parameters<typeof prisma.ingredientReference.update>[0]['data'] = {}
    if (body.name               !== undefined) updateData.name               = body.name?.trim()
    if (body.baseUnit           !== undefined) updateData.baseUnit           = body.baseUnit
    if (body.aisleId            !== undefined) updateData.aisleId            = body.aisleId
    if (body.defaultQuantity    !== undefined) updateData.defaultQuantity    = body.defaultQuantity
    if (body.conversions        !== undefined) updateData.conversions        = body.conversions ?? undefined
    if (body.quickBuyQuantities !== undefined) updateData.quickBuyQuantities = body.quickBuyQuantities ?? undefined
    if (body.imageUrl           !== undefined) updateData.imageUrl           = body.imageUrl

    const ingredient = await prisma.ingredientReference.update({
      where: { id: params.id },
      data:  updateData,
      include: { aisle: true },
    })

    return Response.json({ success: true, data: ingredient } satisfies ApiResponse<IngredientWithAisle>)
  } catch (error: unknown) {
    const isUniqueConstraint = (error as { code?: string }).code === 'P2002'
    if (isUniqueConstraint) {
      return Response.json({ success: false, error: 'Un ingrédient avec ce nom existe déjà' } satisfies ApiResponse<never>, { status: 409 })
    }
    console.error('[gamelle/ingredients/:id PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// DELETE /api/gamelle/ingredients/[id]
// Bloqué si l'ingrédient est utilisé dans au moins une recette.
// Retourne { success: false, blocked: true, recipes: [...] } si bloqué.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    // Vérifier si l'ingrédient est utilisé dans des recettes
    const usages = await prisma.recipeIngredient.findMany({
      where:   { referenceId: params.id },
      include: { recipe: { select: { id: true, title: true } } },
      distinct: ['recipeId'],
    })

    if (usages.length > 0) {
      const recipes: BlockingRecipe[] = usages.map(u => ({
        id:    u.recipe.id,
        title: u.recipe.title,
      }))

      return Response.json(
        { success: false, blocked: true, recipes } satisfies ApiResponse<never> & { blocked: boolean; recipes: BlockingRecipe[] },
        { status: 409 },
      )
    }

    await prisma.ingredientReference.delete({ where: { id: params.id } })
    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[gamelle/ingredients/:id DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
