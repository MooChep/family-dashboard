import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Recurrence } from '@prisma/client'
import { normalizeMonth } from '@/lib/epargne'

// ── GET /api/epargne/budget/lines ─────────────────────────────────────────────
/**
 * Retourne toutes les BudgetLine actives, groupées par catégorie.
 * Query param optionnel : ?categoryId=xxx pour filtrer
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')

  const lines = await prisma.budgetLine.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true },
    orderBy: [{ categoryId: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(lines)
}

// ── POST /api/epargne/budget/lines ────────────────────────────────────────────
/**
 * Crée une nouvelle BudgetLine (template récurrent).
 * Body : { label, amount, categoryId, recurrence, recurrenceMonths?, recurrenceStart? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    label: string
    amount: number
    categoryId: string
    recurrence?: Recurrence
    recurrenceMonths?: number
    recurrenceStart?: string // "YYYY-MM"
  }

  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  if (!body.label?.trim() || body.amount === undefined || !body.categoryId) {
    return NextResponse.json({ error: 'Champs requis : label, amount, categoryId' }, { status: 400 })
  }

  // Vérifie que la catégorie existe
  const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
  if (!category) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })

  // Si CUSTOM, recurrenceMonths est obligatoire
  if (body.recurrence === 'CUSTOM' && (!body.recurrenceMonths || body.recurrenceMonths < 2)) {
    return NextResponse.json({ error: 'recurrenceMonths requis et >= 2 pour CUSTOM' }, { status: 400 })
  }

  const line = await prisma.budgetLine.create({
    data: {
      label:            body.label.trim(),
      amount:           body.amount,
      categoryId:       body.categoryId,
      recurrence:       body.recurrence ?? 'NONE',
      recurrenceMonths: body.recurrenceMonths ?? null,
      recurrenceStart:  body.recurrenceStart
        ? normalizeMonth(body.recurrenceStart)
        : null,
    },
    include: { category: true },
  })

  return NextResponse.json(line, { status: 201 })
}