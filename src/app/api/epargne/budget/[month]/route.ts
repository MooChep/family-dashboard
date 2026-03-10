import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth, formatMonth } from '@/lib/epargne'

// ── Helpers récurrence ────────────────────────────────────────────────────────

/**
 * Vérifie si une BudgetLine récurrente doit apparaître dans un mois donné.
 * Logique :
 *  - MONTHLY  : toujours
 *  - QUARTERLY: si (moisCible - recurrenceStart) est un multiple de 3
 *  - ANNUAL   : si même mois que recurrenceStart
 *  - CUSTOM   : si (moisCible - recurrenceStart) est un multiple de recurrenceMonths
 *  - NONE     : jamais (ponctuel, ajout manuel uniquement)
 */
function isLineActiveForMonth(
  line: {
    recurrence: string
    recurrenceMonths: number | null
    recurrenceStart: Date | null
  },
  targetMonth: Date
): boolean {
  if (line.recurrence === 'NONE') return false
  if (line.recurrence === 'MONTHLY') return true

  // Pour les autres, on a besoin d'une date de référence
  const ref = line.recurrenceStart ?? new Date(Date.UTC(2024, 0, 1))
  const refYear  = ref.getUTCFullYear()
  const refMonth = ref.getUTCMonth()
  const tgtYear  = targetMonth.getUTCFullYear()
  const tgtMonth = targetMonth.getUTCMonth()

  // Nombre de mois entre ref et target
  const diff = (tgtYear - refYear) * 12 + (tgtMonth - refMonth)
  if (diff < 0) return false // le mois cible est avant le début

  if (line.recurrence === 'QUARTERLY') return diff % 3 === 0
  if (line.recurrence === 'ANNUAL')    return diff % 12 === 0
  if (line.recurrence === 'CUSTOM') {
    const n = line.recurrenceMonths ?? 1
    return diff % n === 0
  }

  return false
}

// ── GET /api/epargne/budget/[month] ──────────────────────────────────────────
/**
 * Retourne l'état complet du budget pour un mois donné :
 * - Le BudgetMonth (statut DRAFT/VALIDATED)
 * - Les BudgetEntry groupées par catégorie
 * - Les transactions réelles du mois pour comparaison
 * - Les suggestions historiques (moyenne 3 mois) par catégorie
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { month: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const month = normalizeMonth(params.month)

  // ── État du mois ──────────────────────────────────────────────────────────
  const budgetMonth = await prisma.budgetMonth.findUnique({ where: { month } })

  // ── Entrées budget du mois ────────────────────────────────────────────────
  const entries = await prisma.budgetEntry.findMany({
    where: { month },
    include: { category: true, budgetLine: true },
    orderBy: [{ categoryId: 'asc' }, { createdAt: 'asc' }],
  })

  // ── Transactions réelles du mois (pour suivi réel vs prévu) ──────────────
  const transactions = await prisma.transaction.findMany({
    where: { month },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  // ── Suggestions : moyenne des 3 mois précédents par catégorie ─────────────
  const threeMonthsAgo = new Date(Date.UTC(
    month.getUTCFullYear(),
    month.getUTCMonth() - 3,
    1
  ))
  const historicalTx = await prisma.transaction.findMany({
    where: {
      month: { gte: threeMonthsAgo, lt: month },
      category: { isArchived: false },
    },
    include: { category: true },
  })

  // Calcule la moyenne par catégorie sur les 3 mois
  const suggestionMap: Record<string, { total: number; count: number; label: string }> = {}
  for (const tx of historicalTx) {
    const key = tx.categoryId
    if (!suggestionMap[key]) {
      suggestionMap[key] = { total: 0, count: 0, label: tx.category.name }
    }
    // On compte en valeur absolue pour l'affichage
    suggestionMap[key].total += Math.abs(tx.amount)
    // On track les mois distincts pour une vraie moyenne
    suggestionMap[key].count += 1
  }
  const suggestions = Object.entries(suggestionMap).map(([categoryId, data]) => ({
    categoryId,
    label: data.label,
    // Moyenne mensuelle sur 3 mois
    average: Math.round((data.total / 3) * 100) / 100,
  }))

  return NextResponse.json({
    month: formatMonth(month),
    budgetMonth,
    entries,
    transactions,
    suggestions,
  })
}

// ── POST /api/epargne/budget/[month] ─────────────────────────────────────────
/**
 * Génère les BudgetEntry pour un mois depuis les BudgetLine récurrentes actives.
 * Idempotent : ne recrée pas les entries déjà existantes pour ce mois.
 * Crée aussi le BudgetMonth en DRAFT si inexistant.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { month: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const month = normalizeMonth(params.month)

  // Crée le BudgetMonth en DRAFT si inexistant
  const budgetMonth = await prisma.budgetMonth.upsert({
    where: { month },
    update: {},
    create: { month, status: 'DRAFT' },
  })

  // Récupère toutes les BudgetLine actives récurrentes
  const lines = await prisma.budgetLine.findMany({
    where: { isActive: true, recurrence: { not: 'NONE' } },
  })

  // Filtre celles qui s'appliquent à ce mois
  const applicableLines = lines.filter((l) => isLineActiveForMonth(l, month))

  // Récupère les budgetLineId déjà générés pour ce mois (idempotence)
  const existingEntries = await prisma.budgetEntry.findMany({
    where: { month, budgetLineId: { not: null } },
    select: { budgetLineId: true },
  })
  const existingLineIds = new Set(existingEntries.map((e) => e.budgetLineId))

  // Crée uniquement les entries manquantes
  const toCreate = applicableLines.filter((l) => !existingLineIds.has(l.id))

  if (toCreate.length > 0) {
    await prisma.budgetEntry.createMany({
      data: toCreate.map((l) => ({
        month,
        label:       l.label,
        amount:      l.amount,
        categoryId:  l.categoryId,
        budgetLineId: l.id,
        isModified:  false,
      })),
    })
  }

  return NextResponse.json({
    budgetMonth,
    generated: toCreate.length,
    skipped: applicableLines.length - toCreate.length,
  })
}

// ── PATCH /api/epargne/budget/[month] ────────────────────────────────────────
/**
 * Valide le budget du mois (DRAFT → VALIDATED).
 * Déclenche la mise à jour du targetAmount des projets d'épargne
 * depuis les BudgetEntry de leurs catégories PROJECT.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { month: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const month = normalizeMonth(params.month)

  const budgetMonth = await prisma.budgetMonth.findUnique({ where: { month } })
  if (!budgetMonth) {
    return NextResponse.json({ error: 'Budget introuvable pour ce mois' }, { status: 404 })
  }
  if (budgetMonth.status === 'VALIDATED') {
    return NextResponse.json({ error: 'Budget déjà validé' }, { status: 409 })
  }

  // ── Met à jour les targetAmount des projets d'épargne ────────────────────
  // Pour chaque catégorie PROJECT, somme les BudgetEntry du mois
  // et met à jour le targetAmount du projet associé
  const projectCategories = await prisma.category.findMany({
    where: { type: 'PROJECT', isArchived: false },
    include: { projects: { where: { isActive: true } } },
  })

  const projectUpdates: ReturnType<typeof prisma.savingsProject.update>[] = []

  for (const cat of projectCategories) {
    // Somme des entries budget pour cette catégorie ce mois
    const entriesSum = await prisma.budgetEntry.aggregate({
      where: { month, categoryId: cat.id },
      _sum: { amount: true },
    })
    const total = entriesSum._sum.amount ?? 0

    // Met à jour tous les projets actifs liés à cette catégorie
    for (const project of cat.projects) {
      if (total > 0) {
        projectUpdates.push(
          prisma.savingsProject.update({
            where: { id: project.id },
            data: { targetAmount: total },
          })
        )
      }
    }
  }

  // Exécute toutes les mises à jour + validation du mois en transaction
  await prisma.$transaction([
    ...projectUpdates,
    prisma.budgetMonth.update({
      where: { month },
      data: { status: 'VALIDATED' },
    }),
  ])

  return NextResponse.json({ success: true, month: formatMonth(month) })
}