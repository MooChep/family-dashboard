import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/gamelle/shopping/[id]/activate
 * Passe la liste de DRAFT à ACTIVE (check placard validé).
 * Irréversible — une liste ACTIVE ne repasse jamais en DRAFT.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await prisma.shoppingList.findUnique({ where: { id: params.id } })
  if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  if (list.status !== 'DRAFT') return NextResponse.json({ error: 'La liste n\'est pas en statut DRAFT' }, { status: 409 })

  const updated = await prisma.shoppingList.update({
    where: { id: params.id },
    data:  { status: 'ACTIVE' },
  })

  return NextResponse.json(updated)
}
