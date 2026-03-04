import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeMonth } from '@/lib/epargne'
import { resolveTags } from '@/lib/tags'

interface RouteParams {
  params: { id: string }
}

// PUT /api/epargne/transactions/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })

  let body: {
    month?: string
    amount?: number
    categoryId?: string
    tags?: string[]
    pointed?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // Résolution des tags si fournis
  let resolvedTagsJson: string | undefined
  if (body.tags !== undefined) {
    // Récupère tous les tags existants sauf ceux de la transaction en cours
    const allTx = await prisma.transaction.findMany({
      where: { id: { not: params.id } },
      select: { tags: true },
    })
    const existingTags = extractAllTags(allTx.map((t) => t.tags))
    resolvedTagsJson = JSON.stringify(resolveTags(body.tags, existingTags))
  }

  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      ...(body.month      !== undefined && { month: normalizeMonth(body.month) }),
      ...(body.amount     !== undefined && { amount: body.amount }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(resolvedTagsJson !== undefined && { tags: resolvedTagsJson }),
      ...(body.pointed    !== undefined && { pointed: body.pointed }),
    },
    include: { category: true },
  })

  return NextResponse.json(transaction)
}

// DELETE /api/epargne/transactions/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const existing = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })

  await prisma.transaction.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractAllTags(rawList: unknown[]): string[] {
  const set = new Set<string>()
  for (const raw of rawList) {
    try {
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as string[]) : []
      for (const t of parsed) { if (t) set.add(t) }
    } catch { /* ignore */ }
  }
  return Array.from(set)
}