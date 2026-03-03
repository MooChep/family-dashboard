import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toYearMonth } from '@/lib/analyses'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const fromParam   = searchParams.get('from')
  const toParam     = searchParams.get('to')
  const periodParam = searchParams.get('period')

  let startDate: Date
  let endDate: Date
  const now = new Date()

  if (fromParam && toParam) {
    const [fy, fm] = fromParam.split('-').map(Number)
    const [ty, tm] = toParam.split('-').map(Number)
    startDate = new Date(Date.UTC(fy, fm - 1, 1))
    endDate   = new Date(Date.UTC(ty, tm - 1, 1))
  } else {
    const period = parseInt(periodParam ?? '6', 10)
    if (![3, 6, 12].includes(period)) {
      return NextResponse.json({ error: 'Période invalide : 3, 6 ou 12' }, { status: 400 })
    }
    endDate   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - period + 1, 1))
  }

  if (startDate > endDate) {
    return NextResponse.json({ error: 'La date de début doit être avant la date de fin' }, { status: 400 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { month: { gte: startDate, lte: endDate } },
    include: { category: true },
    orderBy: { month: 'asc' },
  })

  const allocations = await prisma.savingsAllocation.findMany({
    where: { month: { gte: startDate, lte: endDate }, amount: { gt: 0 } },
    include: { project: true },
    orderBy: { month: 'asc' },
  })

  const projects = await prisma.savingsProject.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const expensesByMonth: Record<string, Record<string, number>> = {}
  const revenueByMonth: Record<string, number> = {}
  const tagsByMonth: Record<string, { tag: string; category: string; amount: number; month: string }[]> = {}

  for (const tx of transactions) {
    const monthKey = toYearMonth(tx.month)

    if (tx.category.type === 'EXPENSE') {
      if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = {}
      expensesByMonth[monthKey][tx.category.name] =
        (expensesByMonth[monthKey][tx.category.name] ?? 0) + tx.amount
    }

    if (tx.category.type === 'INCOME') {
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] ?? 0) + tx.amount
    }

    // Tags : toujours stockés en String JSON — JSON.parse obligatoire
    let parsedTags: string[] = []
    try {
      parsedTags = typeof tx.tags === 'string'
        ? (JSON.parse(tx.tags) as string[])
        : Array.isArray(tx.tags) ? (tx.tags as string[]) : []
    } catch { parsedTags = [] }

    for (const tag of parsedTags) {
      if (!tag || typeof tag !== 'string') continue
      if (!tagsByMonth[monthKey]) tagsByMonth[monthKey] = []
      tagsByMonth[monthKey].push({ tag, category: tx.category.name, amount: tx.amount, month: monthKey })
    }
  }

  const savingsByMonth: Record<string, Record<string, number>> = {}
  const savingsRateByMonth: Record<string, number> = {}

  for (const alloc of allocations) {
    const monthKey = toYearMonth(alloc.month)
    if (!savingsByMonth[monthKey]) savingsByMonth[monthKey] = {}
    savingsByMonth[monthKey][alloc.project.name] =
      (savingsByMonth[monthKey][alloc.project.name] ?? 0) + alloc.amount
  }

  for (const monthKey of Object.keys(revenueByMonth)) {
    const rev   = revenueByMonth[monthKey]
    const saved = Object.values(savingsByMonth[monthKey] ?? {}).reduce((s, v) => s + v, 0)
    savingsRateByMonth[monthKey] = rev > 0 ? Math.round((saved / rev) * 100) : 0
  }

  const allAllocations = await prisma.savingsAllocation.findMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
    orderBy: { month: 'asc' },
  })

  const cumulByProject: Record<string, Record<string, number>> = {}
  for (const alloc of allAllocations) {
    const monthKey = toYearMonth(alloc.month)
    if (!cumulByProject[alloc.projectId]) cumulByProject[alloc.projectId] = {}
    const prevMonths = Object.keys(cumulByProject[alloc.projectId]).sort()
    const lastCumul = prevMonths.length > 0
      ? cumulByProject[alloc.projectId][prevMonths[prevMonths.length - 1]]
      : 0
    cumulByProject[alloc.projectId][monthKey] = lastCumul + alloc.amount
  }

  const monthsInPeriod = Object.keys(savingsByMonth).sort()
  const last3 = monthsInPeriod.slice(-3)

  const projections = projects.map((project) => {
    const avg3 = last3.reduce((sum, m) => sum + (savingsByMonth[m]?.[project.name] ?? 0), 0) / Math.max(last3.length, 1)
    return {
      id: project.id,
      name: project.name,
      targetAmount: project.targetAmount,
      currentAmount: project.currentAmount,
      avg3MonthsSaving: Math.round(avg3),
      monthsToTarget: project.targetAmount && avg3 > 0
        ? Math.ceil((project.targetAmount - project.currentAmount) / avg3)
        : null,
      percentComplete: project.targetAmount
        ? Math.min((project.currentAmount / project.targetAmount) * 100, 100)
        : 0,
    }
  })

  const allTagEntries = Object.values(tagsByMonth).flat()
  const tagsSummary: Record<string, { tag: string; category: string; total: number; count: number; entries: { month: string; amount: number }[] }> = {}

  for (const entry of allTagEntries) {
    const key = entry.tag.toLowerCase()
    if (!tagsSummary[key]) {
      tagsSummary[key] = { tag: entry.tag, category: entry.category, total: 0, count: 0, entries: [] }
    }
    tagsSummary[key].total += entry.amount
    tagsSummary[key].count++
    tagsSummary[key].entries.push({ month: entry.month, amount: entry.amount })
  }

  return NextResponse.json({
    period: { from: toYearMonth(startDate), to: toYearMonth(endDate) },
    expensesByMonth,
    revenueByMonth,
    savingsByMonth,
    savingsRateByMonth,
    cumulByProject,
    projections,
    tagsSummary: Object.values(tagsSummary).sort((a, b) => b.total - a.total),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
  })
}