import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/butin'
import { resolveTags } from '@/lib/tags'

// GET /api/butin/transactions?month=2026-02
// GET /api/butin/transactions          (sans month = toutes les transactions)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  const transactions = await prisma.transaction.findMany({
    where: monthParam ? { month: normalizeMonth(monthParam) } : undefined,
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(transactions)
}

// POST /api/butin/transactions
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    month: string
    amount: number
    categoryId: string
    tags?: string[]
    pointed?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.month || body.amount === undefined || !body.categoryId) {
    return NextResponse.json(
      { error: 'Champs requis : month, amount, categoryId' },
      { status: 400 },
    )
  }

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
  if (!category) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })

  // Récupère tous les tags existants pour la déduplication
  const allTx = await prisma.transaction.findMany({ select: { tags: true } })
  const existingTags = extractAllTags(allTx.map((t) => t.tags))

  const resolvedTags = resolveTags(body.tags ?? [], existingTags)

  const transaction = await prisma.transaction.create({
    data: {
      month:      normalizeMonth(body.month),
      amount:     body.amount,
      tags:       JSON.stringify(resolvedTags),
      pointed:    body.pointed ?? false,
      categoryId: body.categoryId,
    },
    include: { category: true },
  })

  return NextResponse.json(transaction, { status: 201 })
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractAllTags(rawList: unknown[]): string[] {
  const set = new Set<string>()
  for (const raw of rawList) {
    try {
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as string[]) : []
      for (const t of parsed) { if (t) set.add(t) }
    } catch { /* ignore */ }
  }
  return Array.from(set)
}