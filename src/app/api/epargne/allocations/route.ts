import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth, calcReste, recalcProjectAmount } from '@/lib/epargne'

// GET /api/epargne/allocations?month=2026-02
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  if (!monthParam) {
    return NextResponse.json({ error: 'Paramètre month requis' }, { status: 400 })
  }

  const month = normalizeMonth(monthParam)

  const allocations = await prisma.savingsAllocation.findMany({
    where: { month },
    include: { project: true },
    orderBy: { project: { createdAt: 'asc' } },
  })

  const reste = await calcReste(month)

  return NextResponse.json({ allocations, reste })
}

// POST /api/epargne/allocations
// Sauvegarde les allocations du mois (upsert pour chaque projet)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    month: string
    allocations: {
      projectId: string
      percentage: number
    }[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.month || !body.allocations?.length) {
    return NextResponse.json(
      { error: 'Champs requis : month, allocations' },
      { status: 400 },
    )
  }

  const month = normalizeMonth(body.month)
  const reste = await calcReste(month)

  const results = []
  const projectIds = new Set<string>()

  for (const alloc of body.allocations) {
    const amount = reste * (alloc.percentage / 100)

    const saved = await prisma.savingsAllocation.upsert({
      where: {
        month_projectId: {
          month,
          projectId: alloc.projectId,
        },
      },
      update: {
        percentage: alloc.percentage,
        amount,
      },
      create: {
        month,
        percentage: alloc.percentage,
        amount,
        projectId: alloc.projectId,
      },
    })

    results.push(saved)
    projectIds.add(alloc.projectId)
  }

  // Recalcule le currentAmount de chaque projet affecté
  for (const projectId of projectIds) {
    await recalcProjectAmount(projectId)
  }

  return NextResponse.json(results, { status: 201 })
}