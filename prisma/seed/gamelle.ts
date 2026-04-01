import { PrismaClient, BaseUnit } from '@prisma/client'

/**
 * Seed Gamelle : rayons + ingrédients courants.
 * Idempotent — upsert par nom/ordre, peut être relancé sans erreur.
 * Ordre des rayons calé sur le parcours magasin (section 12.2 des specs).
 * Noms des ingrédients calés sur la convention Jow pour minimiser les mappings manuels.
 */
export async function seedGamelle(prisma: PrismaClient): Promise<void> {
  console.log('🥘 Seeding Gamelle — rayons + ingrédients...')

  // ── 1. Rayons ─────────────────────────────────────────────────────────────

  const aislesData: { name: string; order: number }[] = [
    { name: 'Électroménager',             order: 1  },
    { name: 'Vaisselle',                  order: 2  },
    { name: 'Maison',                     order: 3  },
    { name: 'Boulangerie',                order: 4  },
    { name: 'Pâtisseries',                order: 5  },
    { name: 'Rôtisserie',                 order: 6  },
    { name: 'Boucherie',                  order: 7  },
    { name: 'Fromagerie',                 order: 8  },
    { name: 'Poissonnerie',               order: 9  },
    { name: 'Fromage libre-service',      order: 10 },
    { name: 'Beurre — Crème — Œuf',       order: 11 },
    { name: 'Épicerie salée',             order: 12 },
    { name: 'Surgelé',                    order: 13 },
    { name: 'Boissons',                   order: 14 },
    { name: 'Fruits & Légumes',           order: 15 },
    { name: 'Charcuterie',               order: 16 },
    { name: 'Hygiène',                    order: 17 },
    { name: 'Épicerie sucrée',            order: 18 },
    { name: 'Produits frais libre-service', order: 19 },
  ]

  const aisleMap: Record<string, string> = {}

  for (const aisle of aislesData) {
    const record = await prisma.aisle.upsert({
      where: { order: aisle.order } as never,
      update: { name: aisle.name },
      create: { name: aisle.name, order: aisle.order },
      // Prisma ne supporte pas upsert sur un champ non-unique directement,
      // on passe par findFirst + create/update
    }).catch(async () => {
      const existing = await prisma.aisle.findFirst({ where: { order: aisle.order } })
      if (existing) {
        return prisma.aisle.update({ where: { id: existing.id }, data: { name: aisle.name } })
      }
      return prisma.aisle.create({ data: { name: aisle.name, order: aisle.order } })
    })
    aisleMap[aisle.name] = record.id
  }

  console.log(`  ✅ ${aislesData.length} rayons créés/mis à jour`)

  // ── 2. Ingrédients ────────────────────────────────────────────────────────

  type IngredientSeed = { name: string; baseUnit: BaseUnit; aisle: string }

  const ingredients: IngredientSeed[] = [
    // ── Boucherie ──────────────────────────────────────────────────────────
    { name: 'Poulet',               baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Blanc de poulet',      baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Cuisse de poulet',     baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Bœuf haché',           baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Steak haché',          baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Filet mignon',         baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Côtes de porc',        baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Escalope de dinde',    baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Veau',                 baseUnit: 'GRAM',       aisle: 'Boucherie' },
    { name: 'Agneau',               baseUnit: 'GRAM',       aisle: 'Boucherie' },

    // ── Charcuterie ────────────────────────────────────────────────────────
    { name: 'Lardons',              baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Jambon blanc',         baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Jambon cru',           baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Chorizo',              baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Saucisse',             baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Merguez',              baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Bacon',                baseUnit: 'GRAM',       aisle: 'Charcuterie' },
    { name: 'Pancetta',             baseUnit: 'GRAM',       aisle: 'Charcuterie' },

    // ── Poissonnerie ───────────────────────────────────────────────────────
    { name: 'Saumon',               baseUnit: 'GRAM',       aisle: 'Poissonnerie' },
    { name: 'Cabillaud',            baseUnit: 'GRAM',       aisle: 'Poissonnerie' },
    { name: 'Crevettes',            baseUnit: 'GRAM',       aisle: 'Poissonnerie' },
    { name: 'Thon en boîte',        baseUnit: 'GRAM',       aisle: 'Poissonnerie' },
    { name: 'Sardines',             baseUnit: 'GRAM',       aisle: 'Poissonnerie' },
    { name: 'Lieu noir',            baseUnit: 'GRAM',       aisle: 'Poissonnerie' },

    // ── Fruits & Légumes ───────────────────────────────────────────────────
    { name: 'Oignon',               baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Échalote',             baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Ail',                  baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Tomate',               baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Tomate cerise',        baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Carotte',              baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Courgette',            baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Aubergine',            baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Poivron rouge',        baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Poivron jaune',        baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Poivron vert',         baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Champignons de Paris', baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Épinards',             baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Poireau',              baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Pomme de terre',       baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Brocoli',              baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Chou-fleur',           baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Haricots verts',       baseUnit: 'GRAM',       aisle: 'Fruits & Légumes' },
    { name: 'Concombre',            baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Salade verte',         baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Avocat',               baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Citron',               baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Pomme',                baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Banane',               baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },
    { name: 'Orange',               baseUnit: 'UNIT',       aisle: 'Fruits & Légumes' },

    // ── Beurre — Crème — Œuf ──────────────────────────────────────────────
    { name: 'Beurre',               baseUnit: 'GRAM',       aisle: 'Beurre — Crème — Œuf' },
    { name: 'Crème liquide entière', baseUnit: 'MILLILITER', aisle: 'Beurre — Crème — Œuf' },
    { name: 'Crème fraîche épaisse', baseUnit: 'GRAM',      aisle: 'Beurre — Crème — Œuf' },
    { name: 'Lait',                 baseUnit: 'MILLILITER', aisle: 'Beurre — Crème — Œuf' },
    { name: 'Lait demi-écrémé',     baseUnit: 'MILLILITER', aisle: 'Beurre — Crème — Œuf' },
    { name: 'Œufs',                 baseUnit: 'UNIT',       aisle: 'Beurre — Crème — Œuf' },

    // ── Fromagerie ─────────────────────────────────────────────────────────
    { name: 'Emmental râpé',        baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Gruyère râpé',         baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Parmesan râpé',        baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Mozzarella',           baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Comté',                baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Cheddar',              baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Fromage de chèvre',    baseUnit: 'GRAM',       aisle: 'Fromagerie' },
    { name: 'Roquefort',            baseUnit: 'GRAM',       aisle: 'Fromagerie' },

    // ── Produits frais libre-service ──────────────────────────────────────
    { name: 'Fromage blanc',        baseUnit: 'GRAM',       aisle: 'Produits frais libre-service' },
    { name: 'Ricotta',              baseUnit: 'GRAM',       aisle: 'Produits frais libre-service' },
    { name: 'Yaourt nature',        baseUnit: 'UNIT',       aisle: 'Produits frais libre-service' },
    { name: 'Mascarpone',           baseUnit: 'GRAM',       aisle: 'Produits frais libre-service' },

    // ── Épicerie salée — féculents ────────────────────────────────────────
    { name: 'Riz',                  baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Pâtes',                baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Spaghettis',           baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Tagliatelles',         baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Fusilli',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Farine',               baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Semoule',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Lentilles vertes',     baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Pois chiches',         baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Haricots rouges',      baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    // Épicerie salée — huiles & condiments
    { name: 'Huile d\'olive',       baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    { name: 'Huile de tournesol',   baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    { name: 'Vinaigre blanc',       baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    { name: 'Vinaigre balsamique',  baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    { name: 'Sauce soja',           baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    { name: 'Moutarde',             baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Ketchup',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Concentré de tomate',  baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Tomates concassées',   baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Bouillon de volaille', baseUnit: 'UNIT',       aisle: 'Épicerie salée' },
    { name: 'Bouillon de bœuf',     baseUnit: 'UNIT',       aisle: 'Épicerie salée' },
    { name: 'Lait de coco',         baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    { name: 'Huile de sésame',      baseUnit: 'MILLILITER', aisle: 'Épicerie salée' },
    // Épicerie salée — épices & aromates
    { name: 'Sel',                  baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Poivre',               baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Cumin',                baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Paprika',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Curcuma',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Herbes de Provence',   baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Thym',                 baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Laurier',              baseUnit: 'UNIT',       aisle: 'Épicerie salée' },
    { name: 'Basilic',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Persil',               baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Coriandre',            baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Origan',               baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Curry',                baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Cannelle',             baseUnit: 'GRAM',       aisle: 'Épicerie salée' },
    { name: 'Maïzena',              baseUnit: 'GRAM',       aisle: 'Épicerie salée' },

    // ── Épicerie sucrée ───────────────────────────────────────────────────
    { name: 'Sucre en poudre',      baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Sucre glace',          baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Cassonade',            baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Levure chimique',      baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Levure boulangère',    baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Chocolat noir',        baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Chocolat au lait',     baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Miel',                 baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Cacao en poudre',      baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Extrait de vanille',   baseUnit: 'MILLILITER', aisle: 'Épicerie sucrée' },
    { name: 'Amandes',              baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Noisettes',            baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },
    { name: 'Noix',                 baseUnit: 'GRAM',       aisle: 'Épicerie sucrée' },

    // ── Surgelé ────────────────────────────────────────────────────────────
    { name: 'Petits pois surgelés', baseUnit: 'GRAM',       aisle: 'Surgelé' },
    { name: 'Épinards surgelés',    baseUnit: 'GRAM',       aisle: 'Surgelé' },
    { name: 'Frites surgelées',     baseUnit: 'GRAM',       aisle: 'Surgelé' },

    // ── Boulangerie ────────────────────────────────────────────────────────
    { name: 'Pain de mie',          baseUnit: 'UNIT',       aisle: 'Boulangerie' },
    { name: 'Pain burger',          baseUnit: 'UNIT',       aisle: 'Boulangerie' },
    { name: 'Tortillas',            baseUnit: 'UNIT',       aisle: 'Boulangerie' },
    { name: 'Chapelure',            baseUnit: 'GRAM',       aisle: 'Boulangerie' },
  ]

  let created = 0
  let updated = 0

  for (const ing of ingredients) {
    const aisleId = aisleMap[ing.aisle]
    if (!aisleId) {
      console.warn(`  ⚠️  Rayon introuvable : ${ing.aisle} (ingrédient ignoré : ${ing.name})`)
      continue
    }

    const existing = await prisma.ingredientReference.findUnique({ where: { name: ing.name } })
    if (existing) {
      await prisma.ingredientReference.update({
        where: { name: ing.name },
        data: { baseUnit: ing.baseUnit, aisleId },
      })
      updated++
    } else {
      await prisma.ingredientReference.create({
        data: { name: ing.name, baseUnit: ing.baseUnit, aisleId },
      })
      created++
    }
  }

  console.log(`  ✅ ${created} ingrédients créés, ${updated} mis à jour (total : ${ingredients.length})`)
  console.log('🎉 Seed Gamelle terminé !')
}

