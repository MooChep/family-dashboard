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
 * Retourne la liste de courses active (la plus récente) avec ses items.
 * Retourne null si aucune liste n'existe.
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
    },
  })

  return NextResponse.json(list ?? null)
}
