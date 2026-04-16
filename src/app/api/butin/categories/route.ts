import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CategoryType } from '@prisma/client'

// GET /api/butin/categories?includeArchived=true
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('includeArchived') === 'true'

  const categories = await prisma.category.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    orderBy: [{ type: 'asc' }, { isFixed: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json(categories)
}

// POST /api/butin/categories
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { name: string; type: CategoryType; isFixed?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  if (!body.name || !body.type) {
    return NextResponse.json({ error: 'Champs requis : name, type' }, { status: 400 })
  }

  if (!Object.values(CategoryType).includes(body.type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  // Si la catégorie existe mais est archivée → la désarchiver
  const existing = await prisma.category.findUnique({ where: { name: body.name } })
  if (existing) {
    if (existing.isArchived) {
      const restored = await prisma.category.update({
        where: { id: existing.id },
        data: { isArchived: false, type: body.type, isFixed: body.isFixed ?? existing.isFixed },
      })
      return NextResponse.json(restored, { status: 200 })
    }
    return NextResponse.json({ error: `Une catégorie "${body.name}" existe déjà` }, { status: 409 })
  }

  const category = await prisma.category.create({
    data: { name: body.name, type: body.type, isFixed: body.isFixed ?? false },
  })
  return NextResponse.json(category, { status: 201 })
}