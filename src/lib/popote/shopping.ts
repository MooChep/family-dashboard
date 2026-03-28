import type { PrismaClient } from '@prisma/client'

export type GeneratedItem = {
  referenceId: string
  label:       string
  aisleId:     string
  aisleOrder:  number
  baseUnit:    'GRAM' | 'MILLILITER' | 'UNIT'
  quantity:    number   // besoin net après déduction stock
  plannedQty:  number   // besoin brut avant déduction stock
}

/**
 * Génère la liste de courses à partir de tous les slots actifs.
 *
 * Ordre des opérations (spec 7.3) :
 * 1. Compiler les ingrédients des slots actifs (isIgnored=false, isStaple=false)
 * 2. Fusionner par referenceId (quantity en base units — pas de conflit d'unités)
 * 3. Déduire Inventory.quantity
 * 4. Filtrer les items ≤ 0
 * 5. Trier par rayon (Aisle.order)
 */
export async function generateShoppingList(prisma: PrismaClient): Promise<GeneratedItem[]> {
  // 1. Tous les slots avec ingrédients actifs
  const slots = await prisma.planningSlot.findMany({
    include: {
      recipe: {
        include: {
          ingredients: {
            where: { isIgnored: false, isStaple: false },
            include: {
              reference: {
                include: { aisle: true },
              },
            },
          },
        },
      },
    },
  })

  const activeSlots = slots.filter(s => s.portionsConsumed < s.portions)

  // 2. Compiler + fusionner par referenceId
  const needed = new Map<string, {
    label:      string
    aisleId:    string
    aisleOrder: number
    baseUnit:   string
    qty:        number
  }>()

  for (const slot of activeSlots) {
    const portionsRemaining = slot.portions - slot.portionsConsumed
    const ratio             = portionsRemaining / (slot.recipe.basePortions || 1)

    for (const ing of slot.recipe.ingredients) {
      const qty      = ing.quantity * ratio
      const existing = needed.get(ing.referenceId)

      if (existing) {
        existing.qty += qty
      } else {
        needed.set(ing.referenceId, {
          label:      ing.reference.name,
          aisleId:    ing.reference.aisleId,
          aisleOrder: ing.reference.aisle.order,
          baseUnit:   ing.reference.baseUnit,
          qty,
        })
      }
    }
  }

  if (needed.size === 0) return []

  // 3. Déduire l'inventaire
  const inventories = await prisma.inventory.findMany({
    where: { referenceId: { in: Array.from(needed.keys()) } },
  })
  const stockMap = new Map(inventories.map(i => [i.referenceId, i.quantity]))

  const result: GeneratedItem[] = []

  for (const [referenceId, item] of needed) {
    const plannedQty = item.qty
    const stock      = stockMap.get(referenceId) ?? 0
    const quantity   = Math.max(0, plannedQty - stock)

    // 4. Filtrer si stock couvre le besoin
    if (quantity <= 0) continue

    result.push({
      referenceId,
      label:      item.label,
      aisleId:    item.aisleId,
      aisleOrder: item.aisleOrder,
      baseUnit:   item.baseUnit as GeneratedItem['baseUnit'],
      quantity,
      plannedQty,
    })
  }

  // 5. Trier par rayon
  result.sort((a, b) => a.aisleOrder - b.aisleOrder)

  return result
}

/** Convertit un BaseUnit Prisma en chaîne d'unité d'affichage. */
export function baseUnitToString(baseUnit: 'GRAM' | 'MILLILITER' | 'UNIT'): string {
  if (baseUnit === 'GRAM')       return 'g'
  if (baseUnit === 'MILLILITER') return 'ml'
  return ''
}
