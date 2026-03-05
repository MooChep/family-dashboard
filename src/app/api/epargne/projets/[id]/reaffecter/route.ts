import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcProjectAmount } from '@/lib/epargne'

interface RouteParams { params: { id: string } }

// PATCH /api/epargne/projets/[id]/reaffecter
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: { targetProjectId: string; month: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  if (!body.targetProjectId || !body.month) {
    return NextResponse.json({ error: 'Champs requis : targetProjectId, month' }, { status: 400 })
  }

  const source = await prisma.savingsProject.findUnique({ where: { id: params.id } })
  const target = await prisma.savingsProject.findUnique({ where: { id: body.targetProjectId } })

  if (!source) return NextResponse.json({ error: 'Projet source introuvable' }, { status: 404 })
  if (!target) return NextResponse.json({ error: 'Projet cible introuvable' }, { status: 404 })
  if (source.id === target.id) {
    return NextResponse.json({ error: 'Source et cible doivent être différents' }, { status: 400 })
  }

  const montantATransferer = source.currentAmount
  const month = new Date(body.month)

  const [existingSource, existingTarget] = await Promise.all([
    prisma.savingsAllocation.findUnique({ where: { month_projectId: { month, projectId: source.id } } }),
    prisma.savingsAllocation.findUnique({ where: { month_projectId: { month, projectId: target.id } } }),
  ])

  await prisma.$transaction([
    // Allocation négative sur la source (vide le projet)
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: source.id } },
      create: { month, percentage: 0, amount: -montantATransferer, projectId: source.id },
      update: { amount: (existingSource?.amount ?? 0) - montantATransferer },
    }),
    // Allocation positive sur la cible
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: target.id } },
      create: { month, percentage: 0, amount: montantATransferer, projectId: target.id },
      update: { amount: (existingTarget?.amount ?? 0) + montantATransferer },
    }),
  ])

  // Recalcule les soldes
  await recalcProjectAmount(source.id)
  await recalcProjectAmount(target.id)

  // Marque le projet source comme inactif
  await prisma.savingsProject.update({
    where: { id: source.id },
    data: { isActive: false },
  })

  // Archive la catégorie liée au projet source
  if (source.categoryId) {
    await prisma.category.update({
      where: { id: source.categoryId },
      data: { isArchived: true },
    })
  }

  const [updatedSource, updatedTarget] = await Promise.all([
    prisma.savingsProject.findUnique({ where: { id: source.id }, include: { category: true } }),
    prisma.savingsProject.findUnique({ where: { id: target.id }, include: { category: true } }),
  ])

  return NextResponse.json({ source: updatedSource, target: updatedTarget })
}