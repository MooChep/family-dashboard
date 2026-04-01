import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/gamelle/shopping/items/[id]/skip
 * Toggle skipped sur un item (check placard).
 * body: { skipped: boolean }  — ou vide pour basculer l'état actuel
 *
 * Un item skipped n'apparaît pas dans la vue courses finale.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.shoppingListItem.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })

  // Si body fourni avec skipped explicite, utiliser cette valeur — sinon toggler
  let skipped: boolean
  try {
    const body = await request.json() as { skipped?: boolean }
    skipped = body.skipped ?? !existing.skipped
  } catch {
    skipped = !existing.skipped
  }

  const updated = await prisma.shoppingListItem.update({
    where: { id: params.id },
    data:  { skipped },
    include: { reference: { include: { aisle: true } } },
  })

  return NextResponse.json(updated)
}
