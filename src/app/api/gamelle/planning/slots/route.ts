import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CreateSlotPayload } from '@/lib/gamelle/types'

const RECIPE_SELECT = {
  id:              true,
  title:           true,
  imageLocal:      true,
  basePortions:    true,
  preparationTime: true,
  cookingTime:     true,
} as const

/** Slot actif = portions restantes > 0 */
function isActive<T extends { portions: number; portionsConsumed: number }>(s: T): boolean {
  return s.portionsConsumed < s.portions
}

/**
 * GET /api/gamelle/planning/slots
 *
 * ?active=true          → tous slots actifs (portionsConsumed < portions)
 * ?from=YYYY-MM-DD&to=  → slots DATED dans la plage + slots FLOATING actifs
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const active = searchParams.get('active')
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')

  // Vue cri : plage de dates + flottants actifs
  if (from && to) {
    const fromDate = new Date(from)
    const toDate   = new Date(to)
    toDate.setHours(23, 59, 59, 999)

    const all = await prisma.planningSlot.findMany({
      include: { recipe: { select: RECIPE_SELECT } },
      orderBy: [{ scheduledDate: 'asc' }, { period: 'asc' }],
    })

    const result = all.filter(s =>
      isActive(s) && (
        (s.type === 'DATED' && s.scheduledDate && s.scheduledDate >= fromDate && s.scheduledDate <= toDate) ||
        s.type === 'FLOATING'
      )
    )

    return NextResponse.json(result)
  }

  // Slots actifs — panier complet
  if (active === 'true') {
    const all = await prisma.planningSlot.findMany({
      include: { recipe: { select: RECIPE_SELECT } },
      orderBy: { addedAt: 'desc' },
    })
    return NextResponse.json(all.filter(isActive))
  }

  // Tous les slots sans filtre
  const slots = await prisma.planningSlot.findMany({
    include: { recipe: { select: RECIPE_SELECT } },
    orderBy: { addedAt: 'desc' },
  })
  return NextResponse.json(slots)
}

/**
 * POST /api/gamelle/planning/slots
 * Ajoute une recette au panier (crée un PlanningSlot).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as CreateSlotPayload

  if (!body.recipeId) {
    return NextResponse.json({ error: 'recipeId requis' }, { status: 400 })
  }

  const recipe = await prisma.recipe.findUnique({ where: { id: body.recipeId } })
  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

  const portions = body.portions ?? recipe.basePortions
  const hasDate  = !!body.scheduledDate

  const slot = await prisma.planningSlot.create({
    data: {
      recipeId:      body.recipeId,
      type:          hasDate ? 'DATED' : 'FLOATING',
      scheduledDate: hasDate ? new Date(body.scheduledDate!) : null,
      period:        body.period ?? null,
      portions,
    },
    include: { recipe: { select: RECIPE_SELECT } },
  })

  return NextResponse.json(slot, { status: 201 })
}
