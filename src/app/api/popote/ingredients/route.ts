import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/popote/types'
import type { BaseUnit, IngredientReference, Aisle } from '@prisma/client'

export type IngredientWithAisle = IngredientReference & { aisle: Aisle }

type CreateIngredientPayload = {
  name:               string
  baseUnit:           BaseUnit
  aisleId:            string
  defaultQuantity?:   number
  conversions?:       unknown
  quickBuyQuantities?: unknown
  imageUrl?:          string
}

// GET /api/popote/ingredients?search=&aisleId=
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search  = searchParams.get('search')?.trim() ?? ''
  const aisleId = searchParams.get('aisleId')?.trim() ?? ''

  try {
    const ingredients = await prisma.ingredientReference.findMany({
      where: {
        ...(search  && { name:    { contains: search } }),
        ...(aisleId && { aisleId }),
      },
      include: { aisle: true },
      orderBy: [
        { aisle: { order: 'asc' } },
        { name: 'asc' },
      ],
    })

    return Response.json({ success: true, data: ingredients } satisfies ApiResponse<IngredientWithAisle[]>)
  } catch (error) {
    console.error('[popote/ingredients GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// POST /api/popote/ingredients
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: CreateIngredientPayload
  try {
    body = await request.json() as CreateIngredientPayload
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.name?.trim() || !body.baseUnit || !body.aisleId) {
    return Response.json({ success: false, error: 'name, baseUnit et aisleId sont requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const ingredient = await prisma.ingredientReference.create({
      data: {
        name:               body.name.trim(),
        baseUnit:           body.baseUnit,
        aisleId:            body.aisleId,
        defaultQuantity:    body.defaultQuantity,
        conversions:        body.conversions ?? undefined,
        quickBuyQuantities: body.quickBuyQuantities ?? undefined,
        imageUrl:           body.imageUrl,
      },
      include: { aisle: true },
    })

    return Response.json({ success: true, data: ingredient } satisfies ApiResponse<IngredientWithAisle>, { status: 201 })
  } catch (error: unknown) {
    const isUniqueConstraint = (error as { code?: string }).code === 'P2002'
    if (isUniqueConstraint) {
      return Response.json({ success: false, error: 'Un ingrédient avec ce nom existe déjà' } satisfies ApiResponse<never>, { status: 409 })
    }
    console.error('[popote/ingredients POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
