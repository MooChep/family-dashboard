import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/popote/inventory/[id]
 * Ajustement manuel de la quantité en stock.
 * body: { quantity: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { quantity?: number }
  if (typeof body.quantity !== 'number') {
    return NextResponse.json({ error: 'quantity requis' }, { status: 400 })
  }

  const existing = await prisma.inventory.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const updated = await prisma.inventory.update({
    where:   { id: params.id },
    data:    { quantity: body.quantity },
    include: { reference: { include: { aisle: true } } },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/popote/inventory/[id]
 * Supprime un item du stock (remet à 0 implicitement).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.inventory.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  await prisma.inventory.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
