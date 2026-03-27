import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { UpdateSlotPayload } from '@/lib/popote/types'

const RECIPE_SELECT = {
  id:              true,
  title:           true,
  imageLocal:      true,
  basePortions:    true,
  preparationTime: true,
  cookingTime:     true,
} as const

/**
 * PATCH /api/popote/planning/slots/[id]
 * Modifie date, period ou portions d'un slot.
 * Passer scheduledDate: null convertit en FLOATING.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.planningSlot.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Slot introuvable' }, { status: 404 })

  const body = (await request.json()) as UpdateSlotPayload

  const updateData: Parameters<typeof prisma.planningSlot.update>[0]['data'] = {}

  if (body.portions !== undefined) {
    if (body.portions < 1) {
      return NextResponse.json({ error: 'portions doit être ≥ 1' }, { status: 400 })
    }
    updateData.portions = body.portions
  }

  if ('scheduledDate' in body) {
    if (body.scheduledDate === null || body.scheduledDate === undefined) {
      updateData.scheduledDate = null
      updateData.type          = 'FLOATING'
    } else {
      updateData.scheduledDate = new Date(body.scheduledDate)
      updateData.type          = 'DATED'
    }
  }

  if ('period' in body) {
    updateData.period = body.period ?? null
  }

  const updated = await prisma.planningSlot.update({
    where: { id: params.id },
    data:  updateData,
    include: { recipe: { select: RECIPE_SELECT } },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/popote/planning/slots/[id]
 * Retire une recette du panier.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.planningSlot.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Slot introuvable' }, { status: 404 })

  await prisma.planningSlot.delete({ where: { id: params.id } })

  return new NextResponse(null, { status: 204 })
}
