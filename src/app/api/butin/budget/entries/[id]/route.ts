import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Helper : recalcule le targetAmount d'un projet PROJECT ────────────────────
/**
 * Après toute modification d'une BudgetEntry sur une catégorie PROJECT,
 * on recalcule le targetAmount du projet lié = somme de toutes ses entries
 * pour le mois concerné.
 *
 * On utilise le mois de l'entry pour ne recalculer que sur le mois actif,
 * pas sur l'historique complet.
 */
async function recalcProjectTarget(categoryId: string, month: Date): Promise<void> {
  // Vérifie que la catégorie est de type PROJECT
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { type: true },
  })
  if (category?.type !== 'PROJECT') return

  // Trouve le projet actif lié à cette catégorie
  const project = await prisma.savingsProject.findFirst({
    where: { categoryId, isActive: true },
  })
  if (!project) return

  // Somme des BudgetEntry du mois pour cette catégorie
  const result = await prisma.budgetEntry.aggregate({
    where: { categoryId, month },
    _sum: { amount: true },
  })
  const newTarget = result._sum.amount ?? 0

  // Met à jour le targetAmount — si 0, on repasse à null (pas d'objectif défini)
  await prisma.savingsProject.update({
    where: { id: project.id },
    data: { targetAmount: newTarget > 0 ? newTarget : null },
  })
}

// ── PATCH /api/butin/budget/entries/[id] ────────────────────────────────────
/**
 * Modifie une BudgetEntry.
 * - Si le BudgetMonth est VALIDATED → isModified = true (warning UI)
 * - Si scope = 'all' → met aussi à jour le template BudgetLine
 * - Si catégorie PROJECT → recalcule le targetAmount du projet
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const entry = await prisma.budgetEntry.findUnique({
    where: { id: params.id },
    include: { budgetLine: true, category: true },
  })
  if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })

  let body: { label?: string; amount?: number; scope?: 'once' | 'all' }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  // Vérifie si le mois est validé
  const budgetMonth = await prisma.budgetMonth.findUnique({ where: { month: entry.month } })
  const isValidated = budgetMonth?.status === 'VALIDATED'

  // ── Mise à jour de l'entry ────────────────────────────────────────────────
  const updatedEntry = await prisma.budgetEntry.update({
    where: { id: params.id },
    data: {
      ...(body.label  !== undefined && { label: body.label.trim() }),
      ...(body.amount !== undefined && { amount: body.amount }),
      // Trace la modification si le mois est déjà validé
      ...(isValidated && { isModified: true }),
    },
    include: { category: true, budgetLine: true },
  })

  // ── Si scope = 'all' → met à jour le template BudgetLine ─────────────────
  if (body.scope === 'all' && entry.budgetLineId) {
    await prisma.budgetLine.update({
      where: { id: entry.budgetLineId },
      data: {
        ...(body.label  !== undefined && { label: body.label.trim() }),
        ...(body.amount !== undefined && { amount: body.amount }),
      },
    })
  }

  // ── Recalcule le targetAmount si catégorie PROJECT ────────────────────────
  // Déclenché systématiquement (mois validé ou non) car le projet
  // doit toujours refléter la somme des entries
  await recalcProjectTarget(entry.categoryId, entry.month)

  return NextResponse.json({ entry: updatedEntry, wasValidated: isValidated })
}

// ── DELETE /api/butin/budget/entries/[id] ───────────────────────────────────
/**
 * Supprime une BudgetEntry.
 * - Si scope = 'all' → désactive aussi la BudgetLine template
 * - Si catégorie PROJECT → recalcule le targetAmount après suppression
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const entry = await prisma.budgetEntry.findUnique({
    where: { id: params.id },
    include: { category: true },
  })
  if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })

  // Mémorise categoryId et month avant suppression pour le recalcul
  const { categoryId, month } = entry

  let body: { scope?: 'once' | 'all' } = {}
  try { body = await request.json() }
  catch { /* scope optionnel */ }

  const deleteOp = prisma.budgetEntry.delete({ where: { id: params.id } })

  // Si scope = 'all' et template existant → désactiver la BudgetLine
  if (body.scope === 'all' && entry.budgetLineId) {
    const lineOp = prisma.budgetLine.update({
      where: { id: entry.budgetLineId },
      data: { isActive: false },
    })
    await prisma.$transaction([deleteOp, lineOp])
  } else {
    await prisma.$transaction([deleteOp])
  }

  // ── Recalcule le targetAmount après suppression ───────────────────────────
  await recalcProjectTarget(categoryId, month)

  return NextResponse.json({ success: true })
}