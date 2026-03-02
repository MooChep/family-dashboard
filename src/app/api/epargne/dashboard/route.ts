import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth, calcReste } from '@/lib/epargne'

// GET /api/epargne/dashboard
// Retourne les données agrégées pour le dashboard du mois courant
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const now = new Date()
  const currentMonth = normalizeMonth(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )

  // Projets actifs avec leurs allocations
  const projets = await prisma.savingsProject.findMany({
    where: { isActive: true },
    include: {
      allocations: {
        where: { month: currentMonth },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Transactions du mois courant
  const transactions = await prisma.transaction.findMany({
    where: { month: currentMonth },
    include: { category: true },
  })

  const revenus = transactions
    .filter((t) => t.category.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const depenses = transactions
    .filter((t) => t.category.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const epargne = projets.reduce(
    (sum, p) => sum + (p.allocations[0]?.amount ?? 0),
    0,
  )

  const reste = await calcReste(currentMonth)

  // Historique des soldes pour le graphique (12 derniers mois)
  const history = await prisma.savingsAllocation.findMany({
    where: {
      month: {
        gte: new Date(Date.UTC(now.getFullYear() - 1, now.getMonth(), 1)),
      },
    },
    include: { project: true },
    orderBy: { month: 'asc' },
  })

  return NextResponse.json({
    currentMonth: currentMonth.toISOString(),
    summary: { revenus, depenses, epargne, reste },
    projets,
    history,
  })
}