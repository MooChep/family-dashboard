import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getLabeurSettings } from '@/lib/labeur/settings'
import { sumInflation, applyInflationCap, applyInflationToPrice, isCursed } from '@/lib/labeur/inflation'
import type { ApiResponse, CreateMarketItemPayload, LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

// ─── Inclusion Prisma standard ────────────────────────────────────────────────
const MARKET_INCLUDE = {
  purchases: {
    orderBy: { purchasedAt: 'desc' as const },
    include: { user: { select: { id: true, name: true } } },
  },
  createdBy: { select: { id: true, name: true } },
} as const

// Type inféré depuis le schéma Prisma avec les relations incluses
type MarketItemFromDB = Prisma.LabeurMarketItemGetPayload<{ include: typeof MARKET_INCLUDE }>

// ─── Helper : enrichir un article avec prix gonflé et état de scellage ────────
function enrichItem(
  item: MarketItemFromDB,
  globalInflationPercent: number,
  curseSeuil: number
): LabeurMarketItemWithPurchases {
  // Prix affiché = prix de base gonflé par l'inflation courante
  const displayPrice = applyInflationToPrice(item.ecuPrice, globalInflationPercent)

  // Article scellé = malédiction active ET article marqué comme scellable
  const isSealed = item.isSealable && isCursed(globalInflationPercent, curseSeuil)

  // Montant déjà financé sur l'achat collectif en cours (contributions non finalisées)
  const collectiveFunded = item.purchases
    .filter((p) => !p.isComplete)
    .reduce((sum, p) => sum + p.ecuSpent, 0)

  return { ...item, displayPrice, isSealed, collectiveFunded }
}

// ─── GET /api/labeur/market ───────────────────────────────────────────────────
// Retourne les articles du Marché avec prix gonflés et état de malédiction.
// ?includeInactive=true → inclut les articles désactivés (pour l'admin)
export async function GET(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

  try {
    const [settings, inflationStates, items] = await Promise.all([
      getLabeurSettings(prisma),
      prisma.labeurInflationState.findMany(),
      prisma.labeurMarketItem.findMany({
        where: includeInactive ? {} : { isActive: true },
        include: MARKET_INCLUDE,
        orderBy: [{ type: 'asc' }, { ecuPrice: 'asc' }],
      }),
    ])

    // Calcul de l'inflation globale courante
    const rawInflation = sumInflation(inflationStates)
    const globalInflationPercent = applyInflationCap(rawInflation, settings.inflationCap)

    const enriched = items.map((item) =>
      enrichItem(item, globalInflationPercent, settings.curseSeuil)
    )

    return Response.json({ success: true, data: enriched } satisfies ApiResponse<typeof enriched>)
  } catch (e) {
    console.error('[GET /api/labeur/market]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── POST /api/labeur/market ──────────────────────────────────────────────────
// Crée un nouvel article dans le Marché.
export async function POST(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  let body: CreateMarketItemPayload
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  if (!body.title?.trim()) {
    return Response.json(
      { success: false, error: 'Le titre est requis' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }
  if (!body.ecuPrice || body.ecuPrice < 1) {
    return Response.json(
      { success: false, error: 'Le prix en écu doit être ≥ 1' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const item = await prisma.labeurMarketItem.create({
      data: {
        title:         body.title.trim(),
        description:   body.description?.trim() ?? null,
        ecuPrice:      body.ecuPrice,
        type:          body.type,
        stock:         body.stock ?? null,
        initialStock:  body.stock ?? null,  // snapshot pour la réinitialisation périodique
        resetFrequency: body.resetFrequency ?? null,
        isSealable:    body.isSealable ?? true,
        createdById:   session.user.id,
      },
      include: MARKET_INCLUDE,
    })

    // Récupérer l'inflation pour enrichir la réponse
    const [settings, inflationStates] = await Promise.all([
      getLabeurSettings(prisma),
      prisma.labeurInflationState.findMany(),
    ])
    const globalInflation = applyInflationCap(
      sumInflation(inflationStates),
      settings.inflationCap
    )

    return Response.json(
      { success: true, data: enrichItem(item, globalInflation, settings.curseSeuil) } satisfies ApiResponse<LabeurMarketItemWithPurchases>,
      { status: 201 }
    )
  } catch (e) {
    console.error('[POST /api/labeur/market]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
