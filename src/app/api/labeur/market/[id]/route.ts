import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from '@/lib/labeur/settings'
import { sumInflation, applyInflationCap, applyInflationToPrice, isCursed } from '@/lib/labeur/inflation'
import type { ApiResponse, UpdateMarketItemPayload, LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

const MARKET_INCLUDE = {
  purchases: {
    orderBy: { purchasedAt: 'desc' as const },
    include: { user: { select: { id: true, name: true } } },
  },
  createdBy: { select: { id: true, name: true } },
} as const

type Params = { params: Promise<{ id: string }> }

// ─── Helper : récupérer l'inflation et enrichir un article ───────────────────
async function fetchInflationAndEnrich(
  item: Awaited<ReturnType<typeof prisma.labeurMarketItem.findUniqueOrThrow>>
): Promise<LabeurMarketItemWithPurchases> {
  const [settings, inflationStates] = await Promise.all([
    getLabeurSettings(prisma),
    prisma.labeurInflationState.findMany(),
  ])

  const itemWithRelations = await prisma.labeurMarketItem.findUniqueOrThrow({
    where: { id: item.id },
    include: MARKET_INCLUDE,
  })

  const globalInflation = applyInflationCap(sumInflation(inflationStates), settings.inflationCap)
  const displayPrice = applyInflationToPrice(item.ecuPrice, globalInflation)
  const isSealed = item.isSealable && isCursed(globalInflation, settings.curseSeuil)
  const collectiveFunded = itemWithRelations.purchases
    .filter((p) => !p.isComplete)
    .reduce((sum, p) => sum + p.ecuSpent, 0)

  return { ...itemWithRelations, displayPrice, isSealed, collectiveFunded }
}

// ─── GET /api/labeur/market/[id] ──────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const item = await prisma.labeurMarketItem.findUnique({ where: { id } })
    if (!item) {
      return Response.json(
        { success: false, error: 'Article introuvable' } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    const enriched = await fetchInflationAndEnrich(item)
    return Response.json({ success: true, data: enriched } satisfies ApiResponse<typeof enriched>)
  } catch (e) {
    console.error('[GET /api/labeur/market/[id]]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── PUT /api/labeur/market/[id] ──────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params

  let body: UpdateMarketItemPayload
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.labeurMarketItem.findUnique({ where: { id } })
    if (!existing) {
      return Response.json(
        { success: false, error: 'Article introuvable' } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }
    if (body.ecuPrice !== undefined && body.ecuPrice < 1) {
      return Response.json(
        { success: false, error: 'Le prix en écu doit être ≥ 1' } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    const updated = await prisma.labeurMarketItem.update({
      where: { id },
      data: {
        ...(body.title         !== undefined && { title: body.title.trim() }),
        ...(body.description   !== undefined && { description: body.description?.trim() ?? null }),
        ...(body.ecuPrice      !== undefined && { ecuPrice: body.ecuPrice }),
        ...(body.type          !== undefined && { type: body.type }),
        ...(body.stock         !== undefined && { stock: body.stock ?? null }),
        ...(body.resetFrequency !== undefined && { resetFrequency: body.resetFrequency ?? null }),
        ...(body.isSealable    !== undefined && { isSealable: body.isSealable }),
      },
    })

    const enriched = await fetchInflationAndEnrich(updated)
    return Response.json({ success: true, data: enriched } satisfies ApiResponse<typeof enriched>)
  } catch (e) {
    console.error('[PUT /api/labeur/market/[id]]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── DELETE /api/labeur/market/[id] ───────────────────────────────────────────
// Soft delete : désactive l'article (isActive = false).
// Les achats historiques sont conservés.
export async function DELETE(_req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const existing = await prisma.labeurMarketItem.findUnique({ where: { id } })
    if (!existing) {
      return Response.json(
        { success: false, error: 'Article introuvable' } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    await prisma.labeurMarketItem.update({
      where: { id },
      data: { isActive: false },
    })

    return Response.json({ success: true, data: null } satisfies ApiResponse<null>)
  } catch (e) {
    console.error('[DELETE /api/labeur/market/[id]]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
