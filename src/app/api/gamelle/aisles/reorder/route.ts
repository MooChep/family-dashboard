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
  const { orderedIds } = body
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds requis' }, { status: 400 })
  }

  try {
    await prisma.$transaction(async tx => {
      // Passe 1 : valeurs négatives temporaires — séquentiel pour éviter l'optimistic locking MariaDB (code 1020)
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.aisle.update({ where: { id: orderedIds[i]! }, data: { order: -(i + 1) } })
      }
      // Passe 2 : valeurs finales
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.aisle.update({ where: { id: orderedIds[i]! }, data: { order: i + 1 } })
      }
    })
  } catch (err) {
    console.error('[reorder] erreur transaction:', err)
    return NextResponse.json({ error: 'Erreur lors du réordonnancement' }, { status: 500 })
  }

  const aisles = await prisma.aisle.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(aisles)
}
