import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'

// GET /api/epargne/transactions?month=2026-02
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  if (!monthParam) {
    return NextResponse.json({ error: 'Paramètre month requis' }, { status: 400 })
  }

  const month = normalizeMonth(monthParam)

  const transactions = await prisma.transaction.findMany({
    where: { month },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(transactions)
}

// POST /api/epargne/transactions
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    month: string
    amount: number
    categoryId: string
    detail?: string
    tags: string
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

  const category = await prisma.category.findUnique({
    where: { id: body.categoryId },
  })

  if (!category) {
    return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })
  }

const transaction = await prisma.transaction.create({
  data: {
    month: normalizeMonth(body.month),
    amount: body.amount,
    detail: body.detail ?? null,
    tags: JSON.stringify(body.tags ?? []),
    pointed: body.pointed ?? false,
    categoryId: body.categoryId,
  },
    include: { category: true },
  })

  return NextResponse.json(transaction, { status: 201 })
}