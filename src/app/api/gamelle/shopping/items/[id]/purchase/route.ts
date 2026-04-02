import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/gamelle/shopping/items/[id]/purchase
 * Marque un item comme acheté ou annule l'achat.
 * body: { quantity?: number; unit?: string; purchased?: boolean }
 *   – purchased: false → annulation (purchasedQuantity: null, pas de rollback stock)
 *   – quantity + unit : quantité réellement achetée (achat)
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

  let body: { quantity?: number; unit?: string; purchased?: boolean } = {}
  try { body = await request.json() as typeof body } catch { /* ignore */ }

  // Annulation d'achat — pas de rollback stock (trop complexe, peu utile)
  if (body.purchased === false) {
    const updated = await prisma.shoppingListItem.update({
      where:   { id: params.id },
      data:    { purchased: false, purchasedQuantity: null },
      include: { reference: { include: { aisle: true } } },
    })
    return NextResponse.json(updated)
  }

  // Achat
  const quantity = body.quantity ?? (item.quantity ?? 0)
  const unit     = body.unit     ?? (item.displayUnit ?? '')

  const baseUnit        = item.reference?.baseUnit ?? 'UNIT'
  const quantityInBase  = _toBaseUnits(quantity, unit, baseUnit)

  await prisma.$transaction(async tx => {
    await tx.shoppingListItem.update({
      where: { id: params.id },
      data:  { purchased: true, purchasedQuantity: quantityInBase },
    })

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
