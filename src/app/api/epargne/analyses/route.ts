import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatMonth } from '@/lib/epargne'

// GET /api/epargne/analyses?period=6
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = parseInt(searchParams.get('period') ?? '6', 10)

  if (![3, 6, 12].includes(period)) {
    return NextResponse.json(
      { error: 'Période invalide : 3, 6 ou 12' },
      { status: 400 },
    )
  }

  const now = new Date()
  const startDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth() - period + 1, 1),
  )

  // Transactions sur la période avec catégorie
  const transactions = await prisma.transaction.findMany({
    where: {
      month: { gte: startDate },
      category: { type: 'EXPENSE' },
    },
    include: { category: true },
    orderBy: { month: 'asc' },
  })

  // Allocations sur la période
  const allocations = await prisma.savingsAllocation.findMany({
    where: { month: { gte: startDate } },
    include: { project: true },
    orderBy: { month: 'asc' },
  })

  // Groupe les dépenses par mois et catégorie
  const expensesByMonth: Record<string, Record<string, number>> = {}
  for (const t of transactions) {
    const monthKey = formatMonth(t.month)
    if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = {}
    const catName = t.category.name
    expensesByMonth[monthKey][catName] =
      (expensesByMonth[monthKey][catName] ?? 0) + t.amount
  }

  // Groupe les soldes cumulés des projets par mois
  const projectsByMonth: Record<string, Record<string, number>> = {}
  for (const a of allocations) {
    const monthKey = formatMonth(a.month)
    if (!projectsByMonth[monthKey]) projectsByMonth[monthKey] = {}
    const projName = a.project.name
    projectsByMonth[monthKey][projName] =
      (projectsByMonth[monthKey][projName] ?? 0) + a.amount
  }

  return NextResponse.json({
    period,
    expensesByMonth,
    projectsByMonth,
  })
}