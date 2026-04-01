import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/gamelle/shopping/items/[id]
 * Supprime un item de la liste (manuel ou généré).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.shoppingListItem.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })

  await prisma.shoppingListItem.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
