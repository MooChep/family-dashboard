import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'

// ── POST /api/epargne/budget/entries ─────────────────────────────────────────
/**
 * Crée une BudgetEntry manuelle (sans BudgetLine, ponctuelle).
 * Utilisée pour les dépenses prévues non récurrentes.
 * Body : { month, label, amount, categoryId }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { month: string; label: string; amount: number; categoryId: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  if (!body.month || !body.label?.trim() || body.amount === undefined || !body.categoryId) {
    return NextResponse.json({ error: 'Champs requis : month, label, amount, categoryId' }, { status: 400 })
  }

  const month = normalizeMonth(body.month)

  // Vérifie que la catégorie existe
  const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
  if (!category) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })

  // S'assure que le BudgetMonth existe (crée en DRAFT si besoin)
  await prisma.budgetMonth.upsert({
    where: { month },
    update: {},
    create: { month, status: 'DRAFT' },
  })

  // Vérifie si mois validé → marquer isModified dès la création
  const budgetMonth = await prisma.budgetMonth.findUnique({ where: { month } })
  const isValidated = budgetMonth?.status === 'VALIDATED'

  const entry = await prisma.budgetEntry.create({
    data: {
      month,
      label:        body.label.trim(),
      amount:       body.amount,
      categoryId:   body.categoryId,
      budgetLineId: null, // ponctuelle, pas de template
      isModified:   isValidated,
    },
    include: { category: true },
  })

  return NextResponse.json(entry, { status: 201 })
}