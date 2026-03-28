import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/popote/inventory
 * Retourne tous les items en stock avec :
 * - quantity    : stock physique
 * - reserved    : Σ besoins des slots actifs (calculé à la volée)
 * - rab         : quantity − reserved (peut être négatif)
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Stock physique
  const inventory = await prisma.inventory.findMany({
    include: { reference: { include: { aisle: true } } },
    orderBy: [{ reference: { aisle: { order: 'asc' } } }, { reference: { name: 'asc' } }],
  })

  if (inventory.length === 0) return NextResponse.json([])

  // Calcul des réservations — besoins du planning actif non consommés
  const activeSlots = await prisma.planningSlot.findMany({
    include: {
      recipe: {
        include: { ingredients: { where: { isIgnored: false, isStaple: false } } },
      },
    },
  })

  // reserved[referenceId] = Σ qty × portionsRestantes / basePortions
  const reserved = new Map<string, number>()
  for (const slot of activeSlots) {
    const remaining = slot.portions - slot.portionsConsumed
    if (remaining <= 0) continue
    const base = slot.recipe.basePortions || 1
    for (const ing of slot.recipe.ingredients) {
      const prev = reserved.get(ing.referenceId) ?? 0
      reserved.set(ing.referenceId, prev + ing.quantity * remaining / base)
    }
  }

  const result = inventory.map(item => ({
    ...item,
    reserved: reserved.get(item.referenceId) ?? 0,
    rab:      item.quantity - (reserved.get(item.referenceId) ?? 0),
  }))

  return NextResponse.json(result)
}

/**
 * POST /api/popote/inventory
 * Ajoute ou met à jour un ingrédient dans le stock.
 * body: { referenceId: string; quantity: number }
 * Upsert : si l'ingrédient est déjà en stock, on écrase la quantité.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { referenceId?: string; quantity?: number }
  if (!body.referenceId || typeof body.quantity !== 'number') {
    return NextResponse.json({ error: 'referenceId et quantity requis' }, { status: 400 })
  }

  const item = await prisma.inventory.upsert({
    where:  { referenceId: body.referenceId },
    update: { quantity: body.quantity },
    create: { referenceId: body.referenceId, quantity: body.quantity },
    include: { reference: { include: { aisle: true } } },
  })

  return NextResponse.json(item, { status: 201 })
}
