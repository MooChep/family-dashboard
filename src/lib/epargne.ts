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

// Calcule le reste mensuel disponible pour l'épargne
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
// en faisant la somme de toutes ses allocations historiques
export async function recalcProjectAmount(projectId: string): Promise<void> {
  const result = await prisma.savingsAllocation.aggregate({
    where: { projectId },
    _sum: { amount: true },
  })

  await prisma.savingsProject.update({
    where: { id: projectId },
    data: { currentAmount: result._sum.amount ?? 0 },
  })
}