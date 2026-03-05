import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'

// GET /api/epargne/regul?month=2026-03
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  if (monthParam) {
    // Régul d'un mois spécifique
    const month = normalizeMonth(monthParam)
    const regul = await prisma.reconciliation.findUnique({
      where: { month },
      include: { entries: { include: { account: true } } },
    })
    return NextResponse.json(regul ?? null)
  }

  // Toutes les réguls (pour le graphique analyses)
  const reguls = await prisma.reconciliation.findMany({
    orderBy: { month: 'asc' },
    include: { entries: { include: { account: true } } },
  })
  return NextResponse.json(reguls)
}

// POST /api/epargne/regul — créer ou mettre à jour la régul du mois
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

  // Calcule totalReal et totalBdd
  const totalReal = body.entries.reduce((s, e) => s + e.balance, 0)

  const projets = await prisma.savingsProject.findMany({ where: { isActive: true } })
  const totalBdd = projets.reduce((s, p) => s + p.currentAmount, 0)
  const gap = totalReal - totalBdd

  // Upsert la régul
  const existing = await prisma.reconciliation.findUnique({ where: { month } })

  const adjustmentId = body.adjustmentId

  const regul = existing
    ? await prisma.reconciliation.update({
        where: { month },
        data: {
          totalReal,
          totalBdd,
          gap,
          note: body.note,
          ...(adjustmentId ? { adjustmentId } : {}),
          entries: {
            deleteMany: {},
            create: body.entries.map((e) => ({ accountId: e.accountId, balance: e.balance })),
          },
        },
        include: { entries: { include: { account: true } } },
      })
    : await prisma.reconciliation.create({
        data: {
          month,
          totalReal,
          totalBdd,
          gap,
          note: body.note,
          ...(adjustmentId ? { adjustmentId } : {}),
          entries: {
            create: body.entries.map((e) => ({ accountId: e.accountId, balance: e.balance })),
          },
        },
        include: { entries: { include: { account: true } } },
      })

  return NextResponse.json(regul, { status: 201 })
}