import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatQuantity } from '@/lib/gamelle/units'

/**
 * POST /api/gamelle/inventory/deduct
 * body: { recipeId: string; portions: number }
 *
 * Déduit du stock les ingrédients d'une recette pour N portions.
 * Utilisé depuis le mode cuisine quand il n'y a pas de slot associé.
 * – Jamais en dessous de 0
 * – Ingrédients absents du stock → warning non bloquant
 * – Stock insuffisant → cap à 0 + warning
 *
 * Réponse : { warnings: string[] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { recipeId?: unknown; portions?: unknown }
  try {
    body = await request.json() as { recipeId?: unknown; portions?: unknown }
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const recipeId = String(body.recipeId ?? '')
  const portions = Number(body.portions)

  if (!recipeId) return NextResponse.json({ error: 'recipeId requis' }, { status: 400 })
  if (!Number.isFinite(portions) || portions <= 0) {
    return NextResponse.json({ error: 'portions doit être un entier > 0' }, { status: 400 })
  }

  const recipe = await prisma.recipe.findUnique({
    where:   { id: recipeId },
    include: {
      ingredients: {
        where: { isStaple: false, isIgnored: false },
        select: {
          quantity:    true,
          referenceId: true,
          reference:   { select: { name: true, baseUnit: true } },
        },
      },
    },
  })

  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

  const ratio    = portions / (recipe.basePortions || 1)
  const warnings: string[] = []

  try {
    await prisma.$transaction(async tx => {
      for (const ing of recipe.ingredients) {
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
          warnings.push(`${name} absent du stock — non déduit`)
          continue
        }

        if (inventory.quantity < needed) {
          warnings.push(
            `${name} : stock insuffisant (${formatQuantity(inventory.quantity, baseUnit)} disponible, ` +
            `${formatQuantity(needed, baseUnit)} nécessaire) — consommé en totalité`
          )
        }

        await tx.inventory.update({
          where: { referenceId: ing.referenceId },
          data:  { quantity: Math.max(0, inventory.quantity - needed) },
        })
      }
    })
  } catch (err) {
    console.error('[inventory/deduct] erreur transaction:', err)
    return NextResponse.json({ error: 'Erreur lors de la déduction' }, { status: 500 })
  }

  return NextResponse.json({ warnings })
}
