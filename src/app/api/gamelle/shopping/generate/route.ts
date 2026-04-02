import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateShoppingList, baseUnitToString } from '@/lib/gamelle/shopping'

/**
 * POST /api/gamelle/shopping/generate
 * body: { slotIds?: string[] }
 *
 * Génère la liste de courses depuis les slots sélectionnés (ou tous les actifs si omis).
 * Stocke les slots liés dans ShoppingListRecipe.
 * Écrase la liste précédente (les ajouts manuels non cochés sont conservés).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let slotIds: string[] | undefined
  try {
    const body = await request.json() as { slotIds?: string[] }
    if (Array.isArray(body.slotIds) && body.slotIds.length > 0) {
      slotIds = body.slotIds
    }
  } catch { /* body vide = pas de slotIds */ }

  const items = await generateShoppingList(prisma, slotIds)

  // Semaine courante pour weekStart
  const now       = new Date()
  const dayOfWeek = now.getDay()
  const diff      = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  // Récupérer les recettes des slots sélectionnés pour ShoppingListRecipe
  const selectedSlots = slotIds
    ? await prisma.planningSlot.findMany({
        where:  { id: { in: slotIds } },
        select: { id: true, recipeId: true, portions: true },
      })
    : await prisma.planningSlot.findMany({
        select: { id: true, recipeId: true, portions: true },
      }).then(all => all)

  const list = await prisma.$transaction(async tx => {
    // Conserver les ajouts manuels non cochés des listes précédentes
    const prevLists = await tx.shoppingList.findMany({
      include: { items: { where: { isManual: true, purchased: false } } },
    })
    const manualSurvivors = prevLists.flatMap(l => l.items)

    // Supprimer toutes les listes précédentes (cascade items + ShoppingListRecipe)
    await tx.shoppingList.deleteMany()

    // Créer la nouvelle liste en statut DRAFT
    const newList = await tx.shoppingList.create({
      data: { weekStart, status: 'DRAFT' },
    })

    // Créer les items générés
    if (items.length > 0) {
      await tx.shoppingListItem.createMany({
        data: items.map(item => ({
          shoppingListId:  newList.id,
          referenceId:     item.referenceId,
          label:           item.label,
          quantity:        item.quantity,
          plannedQuantity: item.plannedQty,
          displayUnit:     baseUnitToString(item.baseUnit),
          skipped:         false,
          purchased:       false,
          isManual:        false,
        })),
      })
    }

    // Réattacher les ajouts manuels survivants
    if (manualSurvivors.length > 0) {
      await tx.shoppingListItem.createMany({
        data: manualSurvivors.map(({ id: _id, shoppingListId: _sid, ...rest }) => ({
          ...rest,
          shoppingListId: newList.id,
        })),
      })
    }

    // Stocker les recettes liées à cette liste
    const recipeLinks = Array.from(
      new Map(selectedSlots.map(s => [s.recipeId, s])).values()
    )
    if (recipeLinks.length > 0) {
      await tx.shoppingListRecipe.createMany({
        data: recipeLinks.map(s => ({
          shoppingListId: newList.id,
          recipeId:       s.recipeId,
          portions:       s.portions,
        })),
        skipDuplicates: true,
      })
    }

    return tx.shoppingList.findUnique({
      where:   { id: newList.id },
      include: {
        items: {
          orderBy: [{ isManual: 'asc' }, { id: 'asc' }],
          include: { reference: { include: { aisle: true } } },
        },
        recipes: {
          include: { recipe: { select: { id: true, title: true, imageLocal: true } } },
        },
      },
    })
  })

  return NextResponse.json(list, { status: 201 })
}
