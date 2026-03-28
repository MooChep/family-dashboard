import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type {
  ApiResponse,
  PaginatedResponse,
  RecipeWithIngredients,
  CreateRecipePayload,
} from '@/lib/popote/types'

const RECIPE_INCLUDE = {
  ingredients: {
    include: {
      reference: { include: { aisle: true } },
    },
  },
} as const

/** Désérialise le champ steps (Json Prisma → RecipeStep[]). */
function parseSteps(recipe: { steps: unknown }): import('@/lib/popote/types').RecipeStep[] {
  return Array.isArray(recipe.steps) ? (recipe.steps as import('@/lib/popote/types').RecipeStep[]) : []
}

// GET /api/popote/recipes?page=1&limit=20&search=
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const search   = searchParams.get('search')?.trim() ?? ''
  const category = searchParams.get('category') ?? ''

  try {
    const where = {
      ...(search   ? { title:    { contains: search } } : {}),
      ...(category ? { category: category as import('@prisma/client').RecipeCategory } : {}),
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: RECIPE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.recipe.count({ where }),
    ])

    const data = recipes.map(r => ({ ...r, steps: parseSteps(r) }))
    return Response.json({
      success: true,
      data: { data, total, page, limit },
    } satisfies ApiResponse<PaginatedResponse<RecipeWithIngredients>>)
  } catch (error) {
    console.error('[popote/recipes GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// POST /api/popote/recipes
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: CreateRecipePayload
  try {
    body = await request.json() as CreateRecipePayload
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.title?.trim()) {
    return Response.json({ success: false, error: 'title est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const recipe = await prisma.recipe.create({
      data: {
        title:           body.title.trim(),
        description:     body.description,
        imageLocal:      body.imageLocal ?? '',
        preparationTime: body.preparationTime,
        cookingTime:     body.cookingTime,
        basePortions:    body.jowId ? 1 : (body.basePortions ?? 4),
        calories:        body.calories,
        utensils:        body.utensils,
        steps:           body.steps ?? [],
        sourceUrl:       body.sourceUrl,
        jowId:           body.jowId,
        category:        body.category ?? 'OTHER',
        ingredients: body.ingredients?.length
          ? {
              create: body.ingredients.map(ing => ({
                referenceId:     ing.referenceId,
                quantity:        ing.quantity,
                displayQuantity: ing.displayQuantity,
                displayUnit:     ing.displayUnit,
                isOptional:      ing.isOptional  ?? false,
                isStaple:        ing.isStaple    ?? false,
                isIgnored:       ing.isIgnored   ?? false,
              })),
            }
          : undefined,
      },
      include: RECIPE_INCLUDE,
    })

    const data = { ...recipe, steps: parseSteps(recipe) }
    return Response.json({ success: true, data } satisfies ApiResponse<RecipeWithIngredients>, { status: 201 })
  } catch (error) {
    const isPrismaUniqueError = (e: unknown) =>
      typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'

    if (isPrismaUniqueError(error)) {
      return Response.json({ success: false, error: 'Cette recette Jow est déjà dans ta bibliothèque.' } satisfies ApiResponse<never>, { status: 409 })
    }
    console.error('[popote/recipes POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
