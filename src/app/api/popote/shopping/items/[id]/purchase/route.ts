import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/popote/shopping/items/[id]/purchase
 * Marque un item comme acheté et met à jour l'inventaire.
 * body: { quantity: number; unit: string }
 *   – quantity + unit : quantité réellement achetée
 * L'inventaire est mis à jour en unités de base.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.shoppingListItem.findUnique({
    where:   { id: params.id },
    include: { reference: true },
  })
  if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })

  let quantity: number
  let unit: string
  try {
    const body = await request.json() as { quantity?: number; unit?: string }
    quantity = body.quantity ?? (item.quantity ?? 0)
    unit     = body.unit     ?? (item.displayUnit ?? '')
  } catch {
    quantity = item.quantity ?? 0
    unit     = item.displayUnit ?? ''
  }

  // Conversion vers l'unité de base pour l'inventaire
  const baseUnit         = item.reference?.baseUnit ?? 'UNIT'
  const quantityInBase   = _toBaseUnits(quantity, unit, baseUnit)
  const purchasedQuantity = quantityInBase

  await prisma.$transaction(async tx => {
    await tx.shoppingListItem.update({
      where: { id: params.id },
      data:  { purchased: true, purchasedQuantity },
    })

    // Mise à jour inventaire si l'item a un ingrédient référencé
    if (item.referenceId && quantityInBase > 0) {
      await tx.inventory.upsert({
        where:  { referenceId: item.referenceId },
        update: { quantity: { increment: quantityInBase } },
        create: { referenceId: item.referenceId, quantity: quantityInBase },
      })
    }
  })

  const updated = await prisma.shoppingListItem.findUnique({
    where:   { id: params.id },
    include: { reference: { include: { aisle: true } } },
  })

  return NextResponse.json(updated)
}

function _toBaseUnits(quantity: number, unit: string, baseUnit: string): number {
  const u = unit.trim().toLowerCase()
  if (baseUnit === 'GRAM') {
    if (u === 'kg') return quantity * 1000
    return quantity
  }
  if (baseUnit === 'MILLILITER') {
    if (u === 'cl') return quantity * 10
    if (['l', 'litre', 'liter'].includes(u)) return quantity * 1000
    return quantity
  }
  return quantity // UNIT
}
