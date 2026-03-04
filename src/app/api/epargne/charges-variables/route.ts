import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'

// GET /api/epargne/charges-variables?month=2026-02
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')
  if (!monthParam) return NextResponse.json({ error: 'Paramètre month requis' }, { status: 400 })

  const month = normalizeMonth(monthParam)

  // Calcule les 3 mois précédents pour la moyenne
  const [year, mo] = monthParam.split('-').map(Number)
  const prev3months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(Date.UTC(year, mo - 2 - i, 1))
    return d
  })

  // Catégories variables (isFixed: false) de type EXPENSE
  const variableCategories = await prisma.category.findMany({
    where: { isFixed: false, type: 'EXPENSE' },
    include: {
      fixedCharges: { where: { month } },
      transactions: { where: { month } },
    },
    orderBy: { name: 'asc' },
  })

  // Transactions des 3 mois précédents pour la moyenne
  const prev3Transactions = await prisma.transaction.findMany({
    where: {
      month: { in: prev3months },
      category: { isFixed: false, type: 'EXPENSE' },
    },
    include: { category: true },
  })

  // Cumul par catégorie sur les 3 mois
  const sumByCategory: Record<string, number> = {}
  const monthsWithDataByCategory: Record<string, Set<number>> = {}

  for (const tx of prev3Transactions) {
    sumByCategory[tx.categoryId] = (sumByCategory[tx.categoryId] ?? 0) + tx.amount
    if (!monthsWithDataByCategory[tx.categoryId]) {
      monthsWithDataByCategory[tx.categoryId] = new Set()
    }
    monthsWithDataByCategory[tx.categoryId].add(tx.month.getTime())
  }

  // Moyenne = cumul / nombre de mois distincts avec au moins une transaction
  const avgByCategory: Record<string, number> = {}
  for (const catId of Object.keys(sumByCategory)) {
    const distinctMonths = monthsWithDataByCategory[catId]?.size ?? 1
    avgByCategory[catId] = sumByCategory[catId] / distinctMonths
  }

  // Filtre : uniquement les catégories avec transaction ce mois ou un estimé
  const result = variableCategories
    .map((cat) => {
      const charge = cat.fixedCharges[0] ?? null
      const reel = cat.transactions.reduce((sum, t) => sum + t.amount, 0)
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        estimated: charge?.estimated ?? 0,
        reel,
        avg3months: Math.round((avgByCategory[cat.id] ?? 0) * 100) / 100,
      }
    })
    .filter((row) => row.reel > 0 || row.estimated > 0)

  return NextResponse.json(result)
}

// POST /api/epargne/charges-variables — upsert de l'estimé
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { month: string; categoryId: string; estimated: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.month || !body.categoryId || body.estimated === undefined) {
    return NextResponse.json({ error: 'Champs requis : month, categoryId, estimated' }, { status: 400 })
  }

  const month = normalizeMonth(body.month)

  const charge = await prisma.fixedCharge.upsert({
    where: { month_categoryId: { month, categoryId: body.categoryId } },
    update: { estimated: body.estimated },
    create: { month, estimated: body.estimated, categoryId: body.categoryId },
    include: { category: true },
  })

  return NextResponse.json(charge)
}