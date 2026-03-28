import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/popote/planning/slots/[id]/consume
 * body: { portions: number }
 *
 * Enregistre la consommation de N portions d'un slot :
 * 1. Incrémente portionsConsumed sur le slot
 * 2. Déduit Inventory.quantity pour chaque ingrédient non-staple, non-ignoré
 *    (ignoré si l'ingrédient n'est pas en inventaire — stock ne descend pas sous 0)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { portions?: unknown }
  try {
    body = await request.json() as { portions?: unknown }
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const portions = Number(body.portions)
  if (!Number.isFinite(portions) || portions <= 0) {
    return NextResponse.json({ error: 'portions doit être un entier > 0' }, { status: 400 })
  }

  // Charger le slot + recette + ingrédients en une seule requête
  const slot = await prisma.planningSlot.findUnique({
    where: { id: params.id },
    include: {
      recipe: {
        include: {
          ingredients: {
            where: { isStaple: false, isIgnored: false },
            select: { referenceId: true, quantity: true },
          },
        },
      },
    },
  })

  if (!slot) return NextResponse.json({ error: 'Slot introuvable' }, { status: 404 })

  const remaining = slot.portions - slot.portionsConsumed
  if (portions > remaining) {
    return NextResponse.json(
      { error: `Impossible de consommer ${portions} portions : seulement ${remaining} restante(s)` },
      { status: 400 },
    )
  }

  // Ratio portions consommées / basePortions de la recette (quantités stockées pour 1 portion)
  const ratio = portions / (slot.recipe.basePortions || 1)

  await prisma.$transaction(async tx => {
    // Déduire l'inventaire pour chaque ingrédient actif
    for (const ing of slot.recipe.ingredients) {
      const inventory = await tx.inventory.findUnique({
        where: { referenceId: ing.referenceId },
      })
      if (!inventory) continue   // pas en stock → on ignore silencieusement

      const deduction = ing.quantity * ratio
      const newQty    = Math.max(0, inventory.quantity - deduction)

      await tx.inventory.update({
        where: { referenceId: ing.referenceId },
        data:  { quantity: newQty },
      })
    }

    // Incrémenter portionsConsumed
    await tx.planningSlot.update({
      where: { id: params.id },
      data:  { portionsConsumed: slot.portionsConsumed + portions },
    })
  })

  // Retourner le slot mis à jour
  const updated = await prisma.planningSlot.findUnique({
    where:   { id: params.id },
    include: {
      recipe: {
        select: {
          id: true, title: true, imageLocal: true,
          basePortions: true, preparationTime: true, cookingTime: true,
        },
      },
    },
  })

  return NextResponse.json(updated)
}
