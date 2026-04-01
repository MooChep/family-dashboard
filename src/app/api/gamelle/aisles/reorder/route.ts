import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/gamelle/aisles/reorder
 * body: { orderedIds: string[] }
 * Met à jour le champ `order` de chaque rayon selon la position dans le tableau.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { orderedIds?: string[] }
  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds requis' }, { status: 400 })
  }

  await prisma.$transaction(
    body.orderedIds.map((id, index) =>
      prisma.aisle.update({ where: { id }, data: { order: index + 1 } }),
    ),
  )

  const aisles = await prisma.aisle.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(aisles)
}
