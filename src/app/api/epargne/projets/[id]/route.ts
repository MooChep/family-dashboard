import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

// PUT /api/epargne/projets/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.savingsProject.findUnique({
    where: { id: params.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  let body: {
    name?: string
    targetAmount?: number | null
    isActive?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const projet = await prisma.savingsProject.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })

  return NextResponse.json(projet)
}