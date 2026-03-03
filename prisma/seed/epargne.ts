import { PrismaClient, CategoryType } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Seeding épargne...')

  // ─── Catégories ───────────────────────────────────────────────────────────

  const categories: {
    name: string
    type: CategoryType
    isFixed: boolean
  }[] = [
    // Revenus
    { name: 'Salaires',        type: CategoryType.INCOME,  isFixed: false },
    { name: 'CAF',             type: CategoryType.INCOME,  isFixed: false },
    { name: 'Autres revenus',  type: CategoryType.INCOME,  isFixed: false },

    // Charges fixes
    { name: 'Loyer',           type: CategoryType.EXPENSE, isFixed: true },
    { name: 'EDF',             type: CategoryType.EXPENSE, isFixed: true },
    { name: 'Internet',        type: CategoryType.EXPENSE, isFixed: true },
    { name: 'Abonnements',     type: CategoryType.EXPENSE, isFixed: true },
    { name: 'Etudes',          type: CategoryType.EXPENSE, isFixed: true },
    { name: 'Assurances',      type: CategoryType.EXPENSE, isFixed: true },

    // Dépenses variables
    { name: 'Courses',         type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Restaurants',     type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Sorties',         type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Voiture',         type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Shopping',        type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Santé',           type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Bébé',            type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Autres dépenses', type: CategoryType.EXPENSE, isFixed: false },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        type: category.type,
        isFixed: category.isFixed,
      },
      create: category,
    })
  }

  console.log(`✓ ${categories.length} catégories créées`)

  // ─── Projets d'épargne ────────────────────────────────────────────────────

  const projects: {
    name: string
    targetAmount: number | null
  }[] = [
    { name: "Fonds d'urgence", targetAmount: 4000 },
    { name: 'Maison',          targetAmount: 30000 },
    { name: 'Vacances',        targetAmount: 1500 },
    { name: 'Mariage',         targetAmount: 15000 },
    { name: 'Enfants',         targetAmount: null },
  ]

  for (const project of projects) {
    // On vérifie manuellement l'existence car SavingsProject n'a pas de champ unique
    // autre que l'id — on utilise le name comme discriminant pour l'idempotence
    const existing = await prisma.savingsProject.findFirst({
      where: { name: project.name },
    })

    if (!existing) {
      await prisma.savingsProject.create({
        data: {
          name: project.name,
          targetAmount: project.targetAmount,
          currentAmount: 0,
          isActive: true,
        },
      })
    } else {
      console.log(`  → Projet "${project.name}" déjà existant, ignoré`)
    }
  }

  console.log(`✓ ${projects.length} projets d'épargne traités`)
  console.log('Seed épargne terminé ✓')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })