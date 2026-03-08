import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  // ── Calcul du montant réel disponible ──────────────────────────────────────
  // On recalcule depuis la BDD (pas depuis currentAmount qui peut être stale)
  // = somme allocations + somme transactions PROJECT sur la catégorie source
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

  // ── Opérations atomiques ───────────────────────────────────────────────────
  // Stratégie : on ne crée PAS d'allocations fictives négatives/positives.
  // On manipule directement currentAmount des deux projets pour la cohérence
  // immédiate, et on crée UNE allocation de transfert sur la cible pour garder
  // la trace dans l'historique.

  const existingTarget = await prisma.savingsAllocation.findUnique({
    where: { month_projectId: { month, projectId: target.id } },
  })

  await prisma.$transaction([
    // 1. Vide TOUTES les allocations de la source (elles sont transférées)
    //    On crée une allocation de solde négatif = annulation du cumul
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: source.id } },
      create: {
        month,
        percentage: 0,
        amount: -montantDisponible,
        projectId: source.id,
      },
      update: {
        // On annule le cumul existant : on ajoute -montantDisponible au mois choisi
        // ce qui rend la somme totale = 0
        amount: { increment: -montantDisponible },
      },
    }),

    // 2. Ajoute le montant sur la cible pour ce mois
    prisma.savingsAllocation.upsert({
      where: { month_projectId: { month, projectId: target.id } },
      create: {
        month,
        percentage: 0,
        amount: montantDisponible,
        projectId: target.id,
      },
      update: {
        amount: { increment: montantDisponible },
      },
    }),

    // 3. Met à jour directement currentAmount des deux projets
    //    source → 0 (vidé), target → son solde actuel + le transfert
    prisma.savingsProject.update({
      where: { id: source.id },
      data: { currentAmount: 0, isActive: false },
    }),
    prisma.savingsProject.update({
      where: { id: target.id },
      data: { currentAmount: { increment: montantDisponible } },
    }),
  ])

  // 4. Archive la catégorie liée au projet source
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