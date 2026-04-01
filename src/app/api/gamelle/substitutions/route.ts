import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const INCLUDE = {
  reference: { select: { id: true, name: true, baseUnit: true } },
} as const

/** GET /api/gamelle/substitutions — liste toutes les règles */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await prisma.substitutionRule.findMany({
    include: INCLUDE,
    orderBy: { jowName: 'asc' },
  })
  return NextResponse.json(rules)
}

/** POST /api/gamelle/substitutions — créer une règle permanente */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { jowName?: string; referenceId?: string }

  if (!body.jowName?.trim() || !body.referenceId) {
    return NextResponse.json({ error: 'jowName et referenceId requis' }, { status: 400 })
  }

  const rule = await prisma.substitutionRule.upsert({
    where:  { jowName: body.jowName.trim() },
    create: { jowName: body.jowName.trim(), referenceId: body.referenceId },
    update: { referenceId: body.referenceId },
    include: INCLUDE,
  })

  return NextResponse.json(rule, { status: 201 })
}
