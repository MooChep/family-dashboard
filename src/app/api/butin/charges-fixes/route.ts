import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/butin'

// GET /api/butin/charges-fixes?month=2026-02
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  if (!monthParam) {
    return NextResponse.json({ error: 'Paramètre month requis' }, { status: 400 })
  }

  const month = normalizeMonth(monthParam)

  // Récupère toutes les catégories fixes avec leur charge du mois si elle existe
  const fixedCategories = await prisma.category.findMany({
    where: { isFixed: true, type: 'EXPENSE' },
    include: {
      fixedCharges: {
        where: { month },
      },
      transactions: {
        where: { month },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Construit la réponse avec le réel calculé depuis les transactions
  const result = fixedCategories.map((cat) => {
    const charge = cat.fixedCharges[0] ?? null
    const reel = cat.transactions.reduce((sum, t) => sum + t.amount, 0)

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      chargeId: charge?.id ?? null,
      estimated: charge?.estimated ?? 0,
      reel,
    }
  })

  return NextResponse.json(result)
}

// POST /api/butin/charges-fixes — upsert
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    month: string
    categoryId: string
    estimated: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.month || !body.categoryId || body.estimated === undefined) {
    return NextResponse.json(
      { error: 'Champs requis : month, categoryId, estimated' },
      { status: 400 },
    )
  }

  const month = normalizeMonth(body.month)

  const charge = await prisma.fixedCharge.upsert({
    where: {
      month_categoryId: {
        month,
        categoryId: body.categoryId,
      },
    },
    update: { estimated: body.estimated },
    create: {
      month,
      estimated: body.estimated,
      categoryId: body.categoryId,
    },
    include: { category: true },
  })

  return NextResponse.json(charge)
}