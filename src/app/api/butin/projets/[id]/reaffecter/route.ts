import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams { params: { id: string } }

// PATCH /api/butin/projets/[id]/reaffecter
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
  if (!source.isActive) {
    return NextResponse.json({ error: 'Ce projet a déjà été réaffecté' }, { status: 400 })
  }

  // Calcul du montant réel disponible depuis la BDD
  const allocResult = await prisma.savingsAllocation.aggregate({
    where: { projectId: source.id },
    _sum: { amount: true },
  })
  let totalTransactions = 0
  if (source.categoryId) {
    const txResult = await prisma.transaction.aggregate({
      where: { categoryId: source.categoryId },
      _sum: { amount: true },
    })
    totalTransactions = txResult._sum.amount ?? 0
  }
  const montantDisponible = (allocResult._sum.amount ?? 0) + totalTransactions

  if (montantDisponible <= 0) {
    return NextResponse.json({ error: 'Aucun montant disponible à réaffecter' }, { status: 400 })
  }

  const month = new Date(body.month)

  await prisma.$transaction([
    // Allocation négative sur la source pour annuler son cumul
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: source.id } },
      create: { month, percentage: 0, amount: -montantDisponible, projectId: source.id },
      update: { amount: { increment: -montantDisponible } },
    }),
    // Allocation positive sur la cible
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: target.id } },
      create: { month, percentage: 0, amount: montantDisponible, projectId: target.id },
      update: { amount: { increment: montantDisponible } },
    }),
    // Mise à jour des soldes + traçabilité du transfert sur la source
    prisma.savingsProject.update({
      where: { id: source.id },
      data: {
        currentAmount: 0,
        isActive: false,
        transferredToId: target.id,
        transferredMonth: month,
        transferredAmount: montantDisponible,
      },
    }),
    prisma.savingsProject.update({
      where: { id: target.id },
      data: { currentAmount: { increment: montantDisponible } },
    }),
  ])

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

// DELETE /api/butin/projets/[id]/reaffecter — annule la réaffectation
export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const source = await prisma.savingsProject.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  if (source.isActive) return NextResponse.json({ error: 'Ce projet n\'a pas été réaffecté' }, { status: 400 })
  if (!source.transferredToId || !source.transferredMonth || source.transferredAmount == null) {
    return NextResponse.json({ error: 'Données de transfert manquantes — annulation impossible' }, { status: 400 })
  }

  const target = await prisma.savingsProject.findUnique({ where: { id: source.transferredToId } })
  if (!target) return NextResponse.json({ error: 'Projet cible introuvable' }, { status: 404 })

  const month = source.transferredMonth
  const montant = source.transferredAmount

  // Retrouve les allocations de transfert pour les supprimer / corriger
  const allocSource = await prisma.savingsAllocation.findUnique({
    where: { month_projectId: { month, projectId: source.id } },
  })
  const allocTarget = await prisma.savingsAllocation.findUnique({
    where: { month_projectId: { month, projectId: target.id } },
  })

  await prisma.$transaction([
    // ── Source : annule l'allocation négative de transfert ──────────────────
    // Si l'allocation ne valait que le montant négatif → la supprimer
    // Sinon → réduire du montant négatif (rares cas : allocation mixte)
    ...(allocSource
      ? [Math.abs((allocSource.amount + montant)) < 0.001
          ? prisma.savingsAllocation.delete({
              where: { month_projectId: { month, projectId: source.id } },
            })
          : prisma.savingsAllocation.update({
              where: { month_projectId: { month, projectId: source.id } },
              data: { amount: { increment: montant } },
            })
        ]
      : []
    ),

    // ── Cible : annule l'allocation positive de transfert ───────────────────
    ...(allocTarget
      ? [Math.abs((allocTarget.amount - montant)) < 0.001
          ? prisma.savingsAllocation.delete({
              where: { month_projectId: { month, projectId: target.id } },
            })
          : prisma.savingsAllocation.update({
              where: { month_projectId: { month, projectId: target.id } },
              data: { amount: { increment: -montant } },
            })
        ]
      : []
    ),

    // ── Soldes ──────────────────────────────────────────────────────────────
    prisma.savingsProject.update({
      where: { id: source.id },
      data: {
        currentAmount: montant,
        isActive: true,
        transferredToId: null,
        transferredMonth: null,
        transferredAmount: null,
      },
    }),
    prisma.savingsProject.update({
      where: { id: target.id },
      data: { currentAmount: { increment: -montant } },
    }),
  ])

  // Désarchive la catégorie source
  if (source.categoryId) {
    await prisma.category.update({
      where: { id: source.categoryId },
      data: { isArchived: false },
    })
  }

  const [restoredSource, updatedTarget] = await Promise.all([
    prisma.savingsProject.findUnique({ where: { id: source.id }, include: { category: true } }),
    prisma.savingsProject.findUnique({ where: { id: target.id }, include: { category: true } }),
  ])

  return NextResponse.json({ source: restoredSource, target: updatedTarget })
}