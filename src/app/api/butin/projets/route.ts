import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/butin/projets
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const projets = await prisma.savingsProject.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      allocations: { orderBy: { month: 'desc' }, take: 1 },
      category: true,
    },
  })

  return NextResponse.json(projets)
}

// POST /api/butin/projets
// Crée le projet ET sa catégorie homonyme de type PROJECT
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { name: string; targetAmount?: number | null }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  if (!body.name) return NextResponse.json({ error: 'Champ requis : name' }, { status: 400 })

  // Crée ou réactive la catégorie homonyme
  let category = await prisma.category.findUnique({ where: { name: body.name } })
  if (category) {
    if (category.type !== 'PROJECT') {
      return NextResponse.json(
        { error: `Une catégorie "${body.name}" existe déjà avec un type différent` },
        { status: 409 },
      )
    }
    if (category.isArchived) {
      category = await prisma.category.update({
        where: { id: category.id },
        data: { isArchived: false },
      })
    }
  } else {
    category = await prisma.category.create({
      data: { name: body.name, type: 'PROJECT', isFixed: false },
    })
  }

  const projet = await prisma.savingsProject.create({
    data: {
      name: body.name,
      targetAmount: body.targetAmount ?? null,
      currentAmount: 0,
      isActive: true,
      categoryId: category.id,
    },
    include: { allocations: true, category: true },
  })

  return NextResponse.json(projet, { status: 201 })
}