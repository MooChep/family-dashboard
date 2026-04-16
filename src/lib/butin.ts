import { prisma } from '@/lib/prisma'

// Normalise une date au 1er du mois à minuit UTC
// Garantit que tous les mois sont stockés de manière cohérente en BDD
export function normalizeMonth(dateStr: string): Date {
  const [year, month] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
}

// Formate une Date en string "YYYY-MM" pour les comparaisons
export function formatMonth(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Calcule le reste mensuel disponible pour le butin
// Reste = revenus − toutes les dépenses (fixes et variables)
export async function calcReste(month: Date): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { month },
    include: { category: true },
  })

  const revenus = transactions
    .filter((t) => t.category.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const depenses = transactions
    .filter((t) => t.category.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  return revenus - depenses
}

// Recalcule et met à jour le currentAmount d'un projet
// = somme de toutes ses allocations historiques
// + somme de toutes ses transactions PROJECT (dépenses/entrées signées)
export async function recalcProjectAmount(projectId: string): Promise<void> {
  // Récupère la catégorie liée au projet pour trouver les transactions
  const project = await prisma.savingsProject.findUnique({
    where: { id: projectId },
    select: { categoryId: true },
  })

  // Somme des allocations (virements butin mensuels)
  const allocResult = await prisma.savingsAllocation.aggregate({
    where: { projectId },
    _sum: { amount: true },
  })
  const totalAllocations = allocResult._sum.amount ?? 0

  // Somme des transactions sur la catégorie PROJECT (dépenses et entrées signées)
  // Ces montants sont signés : négatif = dépense, positif = entrée
  let totalTransactions = 0
  if (project?.categoryId) {
    const txResult = await prisma.transaction.aggregate({
      where: { categoryId: project.categoryId },
      _sum: { amount: true },
    })
    totalTransactions = txResult._sum.amount ?? 0
  }

  await prisma.savingsProject.update({
    where: { id: projectId },
    data: { currentAmount: totalAllocations + totalTransactions },
  })
}