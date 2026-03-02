import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CategoryType } from '@prisma/client'

interface RouteParams {
  params: { id: string }
}

// PUT /api/epargne/categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })
  }

  let body: {
    name?: string
    type?: CategoryType
    isFixed?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (body.type && !Object.values(CategoryType).includes(body.type)) {
    return NextResponse.json(
      { error: 'Type invalide : INCOME ou EXPENSE' },
      { status: 400 },
    )
  }

  // Vérifie l'unicité du nom si modifié
  if (body.name && body.name !== existing.name) {
    const nameConflict = await prisma.category.findUnique({
      where: { name: body.name },
    })
    if (nameConflict) {
      return NextResponse.json(
        { error: `Une catégorie "${body.name}" existe déjà` },
        { status: 409 },
      )
    }
  }

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.isFixed !== undefined && { isFixed: body.isFixed }),
    },
  })

  return NextResponse.json(category)
}

// DELETE /api/epargne/categories/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { transactions: true } } },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })
  }

  // Règle métier : impossible de supprimer une catégorie avec des transactions
  if (existing._count.transactions > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer : ${existing._count.transactions} transaction(s) utilisent cette catégorie`,
      },
      { status: 409 },
    )
  }

  await prisma.category.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}