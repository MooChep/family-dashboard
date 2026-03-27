import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type {
  ApiResponse,
  RecipeWithIngredients,
  UpdateRecipePayload,
} from '@/lib/popote/types'

const RECIPE_INCLUDE = {
  ingredients: {
    include: {
      reference: { include: { aisle: true } },
    },
  },
} as const

function parseSteps(recipe: { steps: unknown }): import('@/lib/popote/types').RecipeStep[] {
  return Array.isArray(recipe.steps) ? (recipe.steps as import('@/lib/popote/types').RecipeStep[]) : []
}

// GET /api/popote/recipes/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: params.id },
      include: RECIPE_INCLUDE,
    })

    if (!recipe) {
      return Response.json({ success: false, error: 'Recette introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    const data = { ...recipe, steps: parseSteps(recipe) }
    return Response.json({ success: true, data } satisfies ApiResponse<RecipeWithIngredients>)
  } catch (error) {
    console.error('[popote/recipes/:id GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// PATCH /api/popote/recipes/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: UpdateRecipePayload
  try {
    body = await request.json() as UpdateRecipePayload
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const recipe = await prisma.$transaction(async (tx) => {
      // Remplacement complet des ingrédients si fourni
      if (body.ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: params.id } })
        if (body.ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: body.ingredients.map(ing => ({
              recipeId:        params.id,
              referenceId:     ing.referenceId,
              quantity:        ing.quantity,
              displayQuantity: ing.displayQuantity,
              displayUnit:     ing.displayUnit,
              isOptional:      ing.isOptional ?? false,
              isStaple:        ing.isStaple ?? false,
            })),
          })
        }
      }

      return tx.recipe.update({
        where: { id: params.id },
        data: {
          ...(body.title           !== undefined && { title:           body.title?.trim() }),
          ...(body.description     !== undefined && { description:     body.description }),
          ...(body.imageLocal      !== undefined && { imageLocal:      body.imageLocal }),
          ...(body.preparationTime !== undefined && { preparationTime: body.preparationTime }),
          ...(body.cookingTime     !== undefined && { cookingTime:     body.cookingTime }),
          ...(body.basePortions    !== undefined && { basePortions:    body.basePortions }),
          ...(body.calories        !== undefined && { calories:        body.calories }),
          ...(body.utensils        !== undefined && { utensils:        body.utensils }),
          ...(body.steps           !== undefined && { steps:           body.steps }),
          ...(body.sourceUrl       !== undefined && { sourceUrl:       body.sourceUrl }),
        },
        include: RECIPE_INCLUDE,
      })
    })

    const data = { ...recipe, steps: parseSteps(recipe) }
    return Response.json({ success: true, data } satisfies ApiResponse<RecipeWithIngredients>)
  } catch (error) {
    console.error('[popote/recipes/:id PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// DELETE /api/popote/recipes/[id]
// Cascade : retire du planning, décrémente l'inventaire pour les portions restantes,
// supprime la recette (→ cascade RecipeIngredient + PlanningSlot via Prisma).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findUnique({
        where: { id: params.id },
        include: {
          ingredients:  true,
          planningSlots: true,
        },
      })

      if (!recipe) return

      // Déduire l'inventaire pour chaque slot non entièrement consommé
      for (const slot of recipe.planningSlots) {
        const remaining = slot.portions - slot.portionsConsumed
        if (remaining <= 0) continue

        const ratio = remaining / recipe.basePortions

        for (const ing of recipe.ingredients) {
          if (ing.isStaple) continue

          const inventory = await tx.inventory.findUnique({
            where: { referenceId: ing.referenceId },
          })
          if (!inventory) continue

          const deduction = ing.quantity * ratio
          const newQty = Math.max(0, inventory.quantity - deduction)

          await tx.inventory.update({
            where: { referenceId: ing.referenceId },
            data: { quantity: newQty },
          })
        }
      }

      // Suppression — cascade PlanningSlot + RecipeIngredient via schema Prisma
      await tx.recipe.delete({ where: { id: params.id } })
    })

    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[popote/recipes/:id DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
