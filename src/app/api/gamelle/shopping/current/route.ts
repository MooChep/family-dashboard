import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ITEMS_ORDERBY = [
  { skipped:  'asc' as const },
  { isManual: 'asc' as const },
  { id:       'asc' as const },
]

/**
 * GET /api/gamelle/shopping/current
 * Retourne la liste de courses la plus récente avec ses items, son statut et ses recettes liées.
 * Retourne null si aucune liste n'existe ou si la dernière est ARCHIVED.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await prisma.shoppingList.findFirst({
    orderBy: { generatedAt: 'desc' },
    include: {
      items: {
        orderBy: ITEMS_ORDERBY,
        include: { reference: { include: { aisle: true } } },
      },
      recipes: {
        include: { recipe: { select: { id: true, title: true, imageLocal: true } } },
      },
    },
  })

  // Une liste archivée est terminée — on retourne null pour proposer d'en générer une nouvelle
  if (!list || list.status === 'ARCHIVED') return NextResponse.json(null)

  return NextResponse.json(list)
}
