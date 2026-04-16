import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CategoryType } from '@prisma/client'

interface RouteParams { params: { id: string } }

// PUT /api/butin/categories/[id]
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.category.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })

  let body: { name?: string; type?: CategoryType; isFixed?: boolean; isArchived?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  if (body.type && !Object.values(CategoryType).includes(body.type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  if (body.name && body.name !== existing.name) {
    const conflict = await prisma.category.findUnique({ where: { name: body.name } })
    if (conflict) return NextResponse.json({ error: `Une catégorie "${body.name}" existe déjà` }, { status: 409 })
  }

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(body.name       !== undefined && { name: body.name }),
      ...(body.type       !== undefined && { type: body.type }),
      ...(body.isFixed    !== undefined && { isFixed: body.isFixed }),
      ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
    },
  })
  return NextResponse.json(category)
}

// DELETE /api/butin/categories/[id]
// Désormais on archive au lieu de supprimer si des transactions existent
export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { transactions: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })

  // Si transactions liées → archiver au lieu de supprimer
  if (existing._count.transactions > 0) {
    const archived = await prisma.category.update({
      where: { id: params.id },
      data: { isArchived: true },
    })
    return NextResponse.json({ archived: true, category: archived })
  }

  await prisma.category.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}