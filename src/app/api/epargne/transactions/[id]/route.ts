import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'

interface RouteParams {
  params: { id: string }
}

// PUT /api/epargne/transactions/[id]
export async function PUT(
  request: NextRequest,
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

  let body: {
    month?: string
    amount?: number
    categoryId?: string
    detail?: string
    pointed?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      ...(body.month && { month: normalizeMonth(body.month) }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.categoryId && { categoryId: body.categoryId }),
      ...(body.detail !== undefined && { detail: body.detail }),
      ...(body.pointed !== undefined && { pointed: body.pointed }),
    },
    include: { category: true },
  })

  return NextResponse.json(transaction)
}

// DELETE /api/epargne/transactions/[id]
export async function DELETE(
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

  await prisma.transaction.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}