import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CategoryType } from '@prisma/client'

// GET /api/epargne/categories
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const categories = await prisma.category.findMany({
    orderBy: [{ type: 'asc' }, { isFixed: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json(categories)
}

// POST /api/epargne/categories
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    name: string
    type: CategoryType
    isFixed?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.name || !body.type) {
    return NextResponse.json(
      { error: 'Champs requis : name, type' },
      { status: 400 },
    )
  }

  if (!Object.values(CategoryType).includes(body.type)) {
    return NextResponse.json(
      { error: 'Type invalide : INCOME ou EXPENSE' },
      { status: 400 },
    )
  }

  const existing = await prisma.category.findUnique({
    where: { name: body.name },
  })

  if (existing) {
    return NextResponse.json(
      { error: `Une catégorie "${body.name}" existe déjà` },
      { status: 409 },
    )
  }

  const category = await prisma.category.create({
    data: {
      name: body.name,
      type: body.type,
      isFixed: body.isFixed ?? false,
    },
  })

  return NextResponse.json(category, { status: 201 })
}