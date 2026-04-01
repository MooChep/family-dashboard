import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const INCLUDE = {
  reference: { select: { id: true, name: true, baseUnit: true } },
} as const

/** PATCH /api/gamelle/substitutions/[id] — modifier la cible */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { referenceId?: string }
  if (!body.referenceId) {
    return NextResponse.json({ error: 'referenceId requis' }, { status: 400 })
  }

  const existing = await prisma.substitutionRule.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Règle introuvable' }, { status: 404 })

  const rule = await prisma.substitutionRule.update({
    where:  { id: params.id },
    data:   { referenceId: body.referenceId },
    include: INCLUDE,
  })
  return NextResponse.json(rule)
}

/** DELETE /api/gamelle/substitutions/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.substitutionRule.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Règle introuvable' }, { status: 404 })

  await prisma.substitutionRule.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
