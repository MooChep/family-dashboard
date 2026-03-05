import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams { params: { id: string } }

// PUT /api/epargne/projets/[id]
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.savingsProject.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  let body: { name?: string; targetAmount?: number | null; isActive?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  // Si renommage → renommer aussi la catégorie liée
  if (body.name && body.name !== existing.name && existing.categoryId) {
    const conflict = await prisma.category.findUnique({ where: { name: body.name } })
    if (conflict && conflict.id !== existing.categoryId) {
      return NextResponse.json({ error: `Une catégorie "${body.name}" existe déjà` }, { status: 409 })
    }
    await prisma.category.update({
      where: { id: existing.categoryId },
      data: { name: body.name },
    })
  }

  const projet = await prisma.savingsProject.update({
    where: { id: params.id },
    data: {
      ...(body.name         !== undefined && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount }),
      ...(body.isActive     !== undefined && { isActive: body.isActive }),
    },
    include: { allocations: { orderBy: { month: 'desc' }, take: 1 }, category: true },
  })

  return NextResponse.json(projet)
}

// POST /api/epargne/projets/[id]/depense — dépense ou entrée sur un projet
// Body : { amount, month, description?, isExpense }
// → crée une Transaction sur la catégorie du projet
// → met à jour currentAmount du projet
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  return NextResponse.json({ error: 'Utilise /api/epargne/projets/[id]/depense' }, { status: 405 })
}