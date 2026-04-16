import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/butin'

interface RouteParams { params: { id: string } }

// POST /api/butin/projets/[id]/depense
// Body : { amount: number (signé), month: string, tags?: string[] }
// amount < 0 → dépense (currentAmount diminue)
// amount > 0 → entrée (currentAmount augmente)
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const projet = await prisma.savingsProject.findUnique({
    where: { id: params.id },
    include: { category: true },
  })
  if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  if (!projet.categoryId || !projet.category) {
    return NextResponse.json({ error: 'Ce projet n\'a pas de catégorie liée' }, { status: 400 })
  }

  let body: { amount: number; month: string; tags?: string[]; pointed?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  if (body.amount === undefined || body.amount === 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }
  if (!body.month) return NextResponse.json({ error: 'month requis' }, { status: 400 })

  const month = normalizeMonth(body.month)

  // Le montant est signé directement par l'utilisateur : négatif = dépense, positif = entrée

  // Crée la transaction sur la catégorie du projet
  const transaction = await prisma.transaction.create({
    data: {
      month,
      amount: body.amount,   // signé
      tags: JSON.stringify(body.tags ?? []),
      pointed: body.pointed ?? false,
      categoryId: projet.categoryId,
    },
    include: { category: true },
  })

  // Met à jour currentAmount du projet
  const newAmount = projet.currentAmount + body.amount

  const updatedProjet = await prisma.savingsProject.update({
    where: { id: params.id },
    data: { currentAmount: newAmount },
    include: { allocations: { orderBy: { month: 'desc' }, take: 1 }, category: true },
  })

  return NextResponse.json({ transaction, projet: updatedProjet }, { status: 201 })
}