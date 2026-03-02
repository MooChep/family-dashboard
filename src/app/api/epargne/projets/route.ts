import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/epargne/projets
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const projets = await prisma.savingsProject.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      allocations: {
        orderBy: { month: 'desc' },
        take: 1,
      },
    },
  })

  return NextResponse.json(projets)
}

// POST /api/epargne/projets
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    name: string
    targetAmount?: number | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Champ requis : name' }, { status: 400 })
  }

  const projet = await prisma.savingsProject.create({
    data: {
      name: body.name,
      targetAmount: body.targetAmount ?? null,
      currentAmount: 0,
      isActive: true,
    },
  })

  return NextResponse.json(projet, { status: 201 })
}