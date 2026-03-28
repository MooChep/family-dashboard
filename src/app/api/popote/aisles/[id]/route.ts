import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** PATCH /api/popote/aisles/[id] — renomme ou met à jour l'order */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { name?: string; order?: number }

  const data: { name?: string; order?: number } = {}
  if (body.name  !== undefined) data.name  = body.name.trim()
  if (body.order !== undefined) data.order = body.order

  const aisle = await prisma.aisle.update({ where: { id: params.id }, data })
  return NextResponse.json(aisle)
}

/**
 * DELETE /api/popote/aisles/[id]
 * Bloqué si des ingrédients sont rattachés à ce rayon.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.ingredientReference.count({ where: { aisleId: params.id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Ce rayon contient ${count} ingrédient${count > 1 ? 's' : ''} — déplacez-les d'abord.`, blocked: true },
      { status: 409 },
    )
  }

  await prisma.aisle.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
