import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcProjectAmount } from '@/lib/epargne'

interface RouteParams {
  params: { id: string }
}

// PATCH /api/epargne/projets/[id]/reaffecter
// Transfère le solde du projet source vers un projet cible
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: {
    targetProjectId: string
    month: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.targetProjectId || !body.month) {
    return NextResponse.json(
      { error: 'Champs requis : targetProjectId, month' },
      { status: 400 },
    )
  }

  const source = await prisma.savingsProject.findUnique({ where: { id: params.id } })
  const target = await prisma.savingsProject.findUnique({ where: { id: body.targetProjectId } })

  if (!source) return NextResponse.json({ error: 'Projet source introuvable' }, { status: 404 })
  if (!target) return NextResponse.json({ error: 'Projet cible introuvable' }, { status: 404 })

  if (source.id === target.id) {
    return NextResponse.json(
      { error: 'Le projet source et cible doivent être différents' },
      { status: 400 },
    )
  }

  const montantATransferer = source.currentAmount
  const month = new Date(body.month)

  // Récupère les allocations existantes pour ce mois
  const [existingSource, existingTarget] = await Promise.all([
    prisma.savingsAllocation.findUnique({
      where: { month_projectId: { month, projectId: source.id } },
    }),
    prisma.savingsAllocation.findUnique({
      where: { month_projectId: { month, projectId: target.id } },
    }),
  ])

  // Upsert sur les deux allocations — additionne si une entrée existe déjà ce mois
  await prisma.$transaction([
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: source.id } },
      create: {
        month,
        percentage: 0,
        amount: -montantATransferer,
        projectId: source.id,
      },
      update: {
        amount: (existingSource?.amount ?? 0) - montantATransferer,
      },
    }),
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: target.id } },
      create: {
        month,
        percentage: 0,
        amount: montantATransferer,
        projectId: target.id,
      },
      update: {
        amount: (existingTarget?.amount ?? 0) + montantATransferer,
      },
    }),
  ])

  // Recalcule les soldes des deux projets
  await recalcProjectAmount(source.id)
  await recalcProjectAmount(target.id)

  const [updatedSource, updatedTarget] = await Promise.all([
    prisma.savingsProject.findUnique({ where: { id: source.id } }),
    prisma.savingsProject.findUnique({ where: { id: target.id } }),
  ])

  return NextResponse.json({ source: updatedSource, target: updatedTarget })
}