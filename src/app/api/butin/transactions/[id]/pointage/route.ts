import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

// PATCH /api/butin/transactions/[id]/pointage
// Toggle le champ pointed sans avoir à envoyer toute la transaction
export async function PATCH(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.transaction.findUnique({
    where: { id: params.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
  }

  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data: { pointed: !existing.pointed },
    include: { category: true },
  })

  return NextResponse.json(transaction)
}