import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatQuantity } from '@/lib/gamelle/units'

/**
 * POST /api/gamelle/planning/slots/[id]/consume
 * body: { portions: number }
 *
 * Enregistre la consommation de N portions d'un slot :
 * 1. Incrémente portionsConsumed sur le slot
 * 2. Déduit Inventory.quantity pour chaque ingrédient non-staple, non-ignoré
 *    – Jamais en dessous de 0
 *    – Ingrédient absent du stock → warning (non bloquant)
 *    – Stock insuffisant → cap à 0 + warning
 *
 * Réponse : { slot: PlanningSlotWithRecipe, warnings: string[] }
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

  // Charger le slot + recette + ingrédients avec nom et unité de base
  const slot = await prisma.planningSlot.findUnique({
    where: { id: params.id },
    include: {
      recipe: {
        include: {
          ingredients: {
            where: { isStaple: false, isIgnored: false },
            select: {
              referenceId: true,
              quantity: true,
              reference: { select: { name: true, baseUnit: true } },
            },
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

  // Ratio portions consommées / basePortions de la recette
  const ratio = portions / (slot.recipe.basePortions || 1)

  const warnings: string[] = []

  try {
    await prisma.$transaction(async tx => {
      for (const ing of slot.recipe.ingredients) {
        const name     = ing.reference.name
        const baseUnit = ing.reference.baseUnit === 'GRAM'
          ? 'g'
          : ing.reference.baseUnit === 'MILLILITER'
          ? 'ml'
          : ''
        const needed = ing.quantity * ratio

        const inventory = await tx.inventory.findUnique({
          where: { referenceId: ing.referenceId },
        })

        if (!inventory) {
          // Absent du stock — non bloquant, on ignore
          warnings.push(`${name} absent du stock — non déduit`)
          continue
        }

        if (inventory.quantity < needed) {
          // Stock insuffisant — on consomme tout ce qui reste (jamais négatif)
          warnings.push(
            `${name} : stock insuffisant (${formatQuantity(inventory.quantity, baseUnit)} disponible, ` +
            `${formatQuantity(needed, baseUnit)} nécessaire) — consommé en totalité`
          )
        }

        const newQty = Math.max(0, inventory.quantity - needed)
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
  } catch (err) {
    console.error('[consume] erreur transaction:', err)
    return NextResponse.json({ error: 'Erreur lors de la consommation' }, { status: 500 })
  }

  // Retourner le slot mis à jour + warnings
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

  return NextResponse.json({ slot: updated, warnings })
}
