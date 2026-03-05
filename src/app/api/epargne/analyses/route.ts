import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toYearMonth } from '@/lib/analyses'

// Première transaction en BDD (pour borner le sélecteur de période)
const PERIOD_START = '2024-10'

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
      // ── Cumul des comptes réels (depuis les réguls) ──────────────────────────
  const reguls = await prisma.reconciliation.findMany({
    where: { month: { gte: startDate, lte: endDate } },
    orderBy: { month: 'asc' },
  })
  const accountWealthByMonth: Record<string, number> = {}
  for (const r of reguls) {
    accountWealthByMonth[toYearMonth(r.month)] = r.totalReal
  }

  return NextResponse.json({ error: 'Période invalide' }, { status: 400 })
    }
    endDate   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - period + 1, 1))
  }

  if (startDate > endDate) {
    // ── Cumul des comptes réels (depuis les réguls) ──────────────────────────
  const reguls = await prisma.reconciliation.findMany({
    where: { month: { gte: startDate, lte: endDate } },
    orderBy: { month: 'asc' },
  })
  const accountWealthByMonth: Record<string, number> = {}
  for (const r of reguls) {
    accountWealthByMonth[toYearMonth(r.month)] = r.totalReal
  }

  return NextResponse.json({ error: 'Date début > date fin' }, { status: 400 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { month: { gte: startDate, lte: endDate } },
    include: { category: true },
    orderBy: [{ month: 'asc' }, { createdAt: 'asc' }],
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

  // Transactions individuelles indexées par tag (pour la vue analyses/tags)
  // Structure : { [tag]: TransactionRow[] }
  interface TransactionRow {
    id: string
    month: string
    date: string        // ISO date complète pour tri
    amount: number
    isIncome: boolean
    category: string
    tags: string[]
  }
  const txsByTag: Record<string, TransactionRow[]> = {}

  // tagsSummary agrégé (pour les cards par tag)
  const tagsSummaryMap: Record<string, {
    tag: string
    category: string
    total: number
    count: number
    entries: { month: string; amount: number; isIncome: boolean }[]
  }> = {}

  for (const tx of transactions) {
    const monthKey = toYearMonth(tx.month)
    // Pour PROJECT : le montant est signé (négatif = dépense, positif = entrée)
    // Pour INCOME/EXPENSE : amount est toujours positif, le type donne le signe
    const isProject = tx.category.type === 'PROJECT'
    const isIncome  = tx.category.type === 'INCOME' || (isProject && tx.amount > 0)
    const absAmount = Math.abs(tx.amount)

    // expensesByMonth et revenueByMonth excluent les catégories PROJECT
    // (les projets sont tracés séparément via cumulByProject / wealthByMonth)
    if (!isProject) {
      if (!isIncome) {
        if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = {}
        expensesByMonth[monthKey][tx.category.name] =
          (expensesByMonth[monthKey][tx.category.name] ?? 0) + absAmount
      } else {
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] ?? 0) + absAmount
      }
    }

    let parsedTags: string[] = []
    try {
      parsedTags = typeof tx.tags === 'string' ? (JSON.parse(tx.tags) as string[]) : []
    } catch { parsedTags = [] }

    if (parsedTags.length === 0) continue

    const txRow: TransactionRow = {
      id:       tx.id,
      month:    monthKey,
      date:     tx.month.toISOString(),
      amount:   absAmount,
      isIncome,
      category: tx.category.name,
      tags:     parsedTags,
    }

    for (const tag of parsedTags) {
      if (!tag) continue

      // Index par tag
      if (!txsByTag[tag]) txsByTag[tag] = []
      // Evite les doublons (même tx peut avoir plusieurs tags)
      if (!txsByTag[tag].find((t) => t.id === tx.id)) {
        txsByTag[tag].push(txRow)
      }

      // Agrégat pour les cards
      const key = tag.toLowerCase()
      if (!tagsSummaryMap[key]) {
        tagsSummaryMap[key] = { tag, category: tx.category.name, total: 0, count: 0, entries: [] }
      }
      tagsSummaryMap[key].total += tx.amount
      tagsSummaryMap[key].count++
      tagsSummaryMap[key].entries.push({ month: monthKey, amount: tx.amount, isIncome })
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

  // Toutes les transactions PROJECT pour les projets actifs (dépenses/entrées signées)
  const projectCategoryIds = projects.map((p) => p.categoryId).filter(Boolean) as string[]
  const projectTransactions = await prisma.transaction.findMany({
    where: { categoryId: { in: projectCategoryIds } },
    orderBy: { month: 'asc' },
  })
  // Index categoryId → projectId
  const catToProject = new Map(projects.filter((p) => p.categoryId).map((p) => [p.categoryId!, p.id]))

  // Calcule le cumul brut par projet et par mois (allocations + transactions)
  // On collecte tous les événements mois par mois
  type MonthEvent = { month: string; delta: number }
  const eventsByProject: Record<string, MonthEvent[]> = {}

  for (const alloc of allAllocations) {
    const pid = alloc.projectId
    const monthKey = toYearMonth(alloc.month)
    if (!eventsByProject[pid]) eventsByProject[pid] = []
    eventsByProject[pid].push({ month: monthKey, delta: alloc.amount })
  }
  for (const tx of projectTransactions) {
    const pid = catToProject.get(tx.categoryId)
    if (!pid) continue
    const monthKey = toYearMonth(tx.month)
    if (!eventsByProject[pid]) eventsByProject[pid] = []
    eventsByProject[pid].push({ month: monthKey, delta: tx.amount })
  }

  // Génère tous les mois de startDate à endDate pour couvrir la période complète
  function generateMonthRange(from: Date, to: Date): string[] {
    const months: string[] = []
    let cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1))
    while (cur <= end) {
      months.push(toYearMonth(cur))
      cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1))
    }
    return months
  }

  // Pour cumulByProject on couvre toute l'histoire (pas seulement la période)
  // afin que le filtrage côté page soit correct
  const allEventMonths = Object.values(eventsByProject)
    .flatMap((evs) => evs.map((e) => e.month))
  const globalStart = allEventMonths.length > 0
    ? allEventMonths.sort()[0]
    : toYearMonth(startDate)
  const [gsy, gsm] = globalStart.split('-').map(Number)
  const [ey, em]   = toYearMonth(endDate).split('-').map(Number)
  const allMonths  = generateMonthRange(
    new Date(Date.UTC(gsy, gsm - 1, 1)),
    new Date(Date.UTC(ey, em - 1, 1)),
  )

  const cumulByProject: Record<string, Record<string, number>> = {}
  for (const project of projects) {
    const events = eventsByProject[project.id] ?? []
    // Somme des deltas par mois
    const deltaByMonth: Record<string, number> = {}
    for (const ev of events) {
      deltaByMonth[ev.month] = (deltaByMonth[ev.month] ?? 0) + ev.delta
    }
    // Cumul en propageant la dernière valeur connue
    let cumul = 0
    cumulByProject[project.id] = {}
    for (const m of allMonths) {
      cumul += deltaByMonth[m] ?? 0
      cumulByProject[project.id][m] = Math.round(cumul * 100) / 100
    }
  }

  // Tous les mois avec des allocations (toute l'histoire, pas seulement la période)
  const allSavingsMonths = Object.keys(
    allAllocations.reduce((acc, a) => { acc[toYearMonth(a.month)] = true; return acc }, {} as Record<string, boolean>)
  ).sort()

  // Revenus sur toute l'histoire (pour calculer le % moyen global)
  const allRevTransactions = await prisma.transaction.findMany({
    where: { category: { type: 'INCOME' } },
    select: { month: true, amount: true },
  })
  const allRevByMonth: Record<string, number> = {}
  for (const tx of allRevTransactions) {
    const mk = toYearMonth(tx.month)
    allRevByMonth[mk] = (allRevByMonth[mk] ?? 0) + tx.amount
  }

  // Toutes les allocations par projet et par mois (toute l'histoire)
  const allSavingsByMonth: Record<string, Record<string, number>> = {}
  for (const alloc of allAllocations) {
    const mk = toYearMonth(alloc.month)
    if (!allSavingsByMonth[mk]) allSavingsByMonth[mk] = {}
    const projectName = projects.find((p) => p.id === alloc.projectId)?.name ?? ''
    if (projectName) {
      allSavingsByMonth[mk][projectName] = (allSavingsByMonth[mk][projectName] ?? 0) + alloc.amount
    }
  }

  const projections = projects.map((project) => {
    // Moyenne du montant épargné sur toute l'histoire
    const months = allSavingsMonths.filter((m) => allSavingsByMonth[m]?.[project.name] !== undefined)
    const avgMonthlySaving = months.length > 0
      ? months.reduce((s, m) => s + (allSavingsByMonth[m]?.[project.name] ?? 0), 0) / months.length
      : 0

    // % moyen global = montant épargné projet / revenu du mois, moyenné sur toute l'histoire
    const pctMonths = months.filter((m) => (allRevByMonth[m] ?? 0) > 0)
    const avgPct = pctMonths.length > 0
      ? pctMonths.reduce((s, m) => {
          const saved = allSavingsByMonth[m]?.[project.name] ?? 0
          const rev   = allRevByMonth[m] ?? 1
          return s + (saved / rev) * 100
        }, 0) / pctMonths.length
      : 0

    return {
      id: project.id,
      name: project.name,
      targetAmount: project.targetAmount,
      currentAmount: project.currentAmount,
      avgMonthlySaving: Math.round(avgMonthlySaving),
      avgPct: Math.round(avgPct * 10) / 10,   // 1 décimale
      monthsToTarget: project.targetAmount && avgMonthlySaving > 0
        ? Math.ceil((project.targetAmount - project.currentAmount) / avgMonthlySaving)
        : null,
      percentComplete: project.targetAmount
        ? Math.min((project.currentAmount / project.targetAmount) * 100, 100)
        : 0,
    }
  })

  // ── Wealth par mois : somme des cumuls de tous les projets ──────────────────
  // allMonths couvre déjà toute la plage, cumulByProject est complet → simple somme
  const wealthByMonth: Record<string, number> = {}
  for (const m of allMonths) {
    const total = projects.reduce((s, p) => s + (cumulByProject[p.id]?.[m] ?? 0), 0)
    wealthByMonth[m] = Math.round(total * 100) / 100
  }

  // ── Cumul des comptes réels (depuis les réguls) ──────────────────────────
  const reguls = await prisma.reconciliation.findMany({
    where: { month: { gte: startDate, lte: endDate } },
    orderBy: { month: 'asc' },
  })
  const accountWealthByMonth: Record<string, number> = {}
  for (const r of reguls) {
    accountWealthByMonth[toYearMonth(r.month)] = r.totalReal
  }

  return NextResponse.json({
    period: { from: toYearMonth(startDate), to: toYearMonth(endDate) },
    periodStart: PERIOD_START,
    expensesByMonth,
    revenueByMonth,
    savingsByMonth,
    savingsRateByMonth,
    cumulByProject,
    wealthByMonth,
    accountWealthByMonth,
    projections,
    tagsSummary: Object.values(tagsSummaryMap).sort((a, b) => b.total - a.total),
    txsByTag,
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
  })
}