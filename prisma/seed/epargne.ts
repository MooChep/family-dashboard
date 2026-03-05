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
    { name: 'Tabac',           type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Transports',      type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Shopping',        type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Santé',           type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Bébé',            type: CategoryType.EXPENSE, isFixed: false },
    { name: 'Autres dépenses', type: CategoryType.EXPENSE, isFixed: false },

    // Régularisation (catégorie spéciale pour les écarts de régul)
    { name: 'Régularisation',  type: CategoryType.EXPENSE, isFixed: false },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { type: cat.type, isFixed: cat.isFixed, isArchived: false },
      create: { ...cat, isArchived: false },
    })
  }
  console.log(`✓ ${categories.length} catégories`)

  // ─── Projets d'épargne ────────────────────────────────────────────────────
  const projects: { name: string; targetAmount: number | null }[] = [
    { name: "Fonds d'urgence", targetAmount: 4000 },
    { name: 'Maison',          targetAmount: 30000 },
    { name: 'Vacances',        targetAmount: 1500 },
    { name: 'Mariage',         targetAmount: 15000 },
    { name: 'Enfants',         targetAmount: null },
    { name: 'Projets Futurs',  targetAmount: null },
  ]

  for (const project of projects) {
    let category = await prisma.category.findUnique({ where: { name: project.name } })
    if (!category) {
      category = await prisma.category.create({
        data: { name: project.name, type: CategoryType.PROJECT, isFixed: false, isArchived: false },
      })
    } else if (category.type !== CategoryType.PROJECT) {
      console.log(`  ⚠ Catégorie "${project.name}" existe avec type ${category.type}, non modifiée`)
    }

    const existing = await prisma.savingsProject.findFirst({ where: { name: project.name } })
    if (!existing) {
      await prisma.savingsProject.create({
        data: {
          name: project.name,
          targetAmount: project.targetAmount,
          currentAmount: 0,
          isActive: true,
          categoryId: category.id,
        },
      })
      console.log(`  ✓ Projet "${project.name}" créé`)
    } else if (!existing.categoryId) {
      await prisma.savingsProject.update({
        where: { id: existing.id },
        data: { categoryId: category.id },
      })
      console.log(`  → Projet "${project.name}" lié à sa catégorie`)
    } else {
      console.log(`  → Projet "${project.name}" déjà existant, ignoré`)
    }
  }

  // ─── Comptes bancaires ────────────────────────────────────────────────────
  const comptes: { name: string; owner: string }[] = [
    { name: 'Compte Courant Ilan',          owner: 'Ilan' },
    { name: 'Livret Bleu Ilan',             owner: 'Ilan' },
    { name: 'Livret Dev. Dur. Triplex Ilan',owner: 'Ilan' },
    { name: 'Livret Jeune Ilan',            owner: 'Ilan' },
    { name: 'Compte Courant Camille',       owner: 'Camille' },
    { name: 'Livret Jeune Camille',         owner: 'Camille' },
    { name: 'Livret A Camille',             owner: 'Camille' },
  ]

  for (const compte of comptes) {
    await prisma.bankAccount.upsert({
      where: { name: compte.name },
      update: { isActive: true, owner: compte.owner },
      create: { name: compte.name, owner: compte.owner, isActive: true },
    })
  }
  console.log(`✓ ${comptes.length} comptes bancaires`)

  console.log('Seed épargne terminé ✓')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })