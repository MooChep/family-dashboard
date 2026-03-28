import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateShoppingList, baseUnitToString } from '@/lib/popote/shopping'

/**
 * POST /api/popote/shopping/generate
 *
 * Génère la liste de courses depuis les slots actifs :
 * 1. Compile les ingrédients (non ignorés, non placard)
 * 2. Fusionne par referenceId
 * 3. Déduit l'inventaire
 * 4. Filtre les items couverts par le stock
 * 5. Écrase la liste précédente (les ajouts manuels non cochés sont conservés)
 * 6. Crée ShoppingList + ShoppingListItems en base
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Calculer les items à acheter
  const items = await generateShoppingList(prisma)

  // Début de semaine courante (pour le champ weekStart requis)
  const now       = new Date()
  const dayOfWeek = now.getDay()
  const diff      = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  const list = await prisma.$transaction(async tx => {
    // Supprimer les listes précédentes (écrasement) — sauf les ajouts manuels non cochés
    // On récupère d'abord les items manuels survivants
    const prevLists = await tx.shoppingList.findMany({
      include: { items: { where: { isManual: true, purchased: false } } },
    })
    const manualSurvivors = prevLists.flatMap(l => l.items)

    // Supprimer toutes les listes précédentes (cascade items)
    await tx.shoppingList.deleteMany()

    // Créer la nouvelle liste
    const newList = await tx.shoppingList.create({
      data: { weekStart },
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

    return tx.shoppingList.findUnique({
      where:   { id: newList.id },
      include: {
        items: {
          orderBy: [{ isManual: 'asc' }, { id: 'asc' }],
          include: { reference: { include: { aisle: true } } },
        },
      },
    })
  })

  return NextResponse.json(list, { status: 201 })
}
