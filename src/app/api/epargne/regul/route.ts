import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'

// GET /api/epargne/regul?month=2026-03  → array des réguls du mois
// GET /api/epargne/regul                → toutes les réguls
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  if (monthParam) {
    const month = normalizeMonth(monthParam)
    const reguls = await prisma.reconciliation.findMany({
      where: { month },
      orderBy: { createdAt: 'asc' },
      include: { entries: { include: { account: true } } },
    })
    return NextResponse.json(reguls)
  }

  const reguls = await prisma.reconciliation.findMany({
    orderBy: { createdAt: 'asc' },
    include: { entries: { include: { account: true } } },
  })
  return NextResponse.json(reguls)
}

// POST /api/epargne/regul — toujours créer une nouvelle régul (snapshot du jour)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json() as {
    month: string
    entries: { accountId: string; balance: number }[]
    note?: string
    adjustmentId?: string
  }

  const month = normalizeMonth(body.month)
  const totalReal = body.entries.reduce((s, e) => s + e.balance, 0)

  const projets = await prisma.savingsProject.findMany({ where: { isActive: true } })
  const totalBdd = projets.reduce((s, p) => s + p.currentAmount, 0)
  const gap = totalReal - totalBdd

  const regul = await prisma.reconciliation.create({
    data: {
      month,
      totalReal,
      totalBdd,
      gap,
      note: body.note,
      ...(body.adjustmentId ? { adjustmentId: body.adjustmentId } : {}),
      entries: {
        create: body.entries.map((e) => ({ accountId: e.accountId, balance: e.balance })),
      },
    },
    include: { entries: { include: { account: true } } },
  })

  return NextResponse.json(regul, { status: 201 })
}
