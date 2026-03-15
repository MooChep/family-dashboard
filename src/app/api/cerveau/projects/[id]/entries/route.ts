import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Poids de tri pour la priorité ──
const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

// ── GET /api/cerveau/projects/[id]/entries ──

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  // Vérifier que le projet existe
  const project = await prisma.entry.findUnique({
    where:  { id },
    select: { id: true, type: true },
  })
  if (!project || project.type !== 'PROJECT') {
    return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  try {
    const children = await prisma.entry.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
    })

    // ── Section À FAIRE : Todos, Rappels, Discussions ouverts ──
    const openRaw = children.filter(
      (e) => e.status === 'OPEN' && e.type !== 'NOTE'
    )

    // Tri : priorité décroissante, puis dueDate ASC null-last
    const open = openRaw.sort((a, b) => {
      const pa = a.priority ? (PRIORITY_WEIGHT[a.priority] ?? 0) : 0
      const pb = b.priority ? (PRIORITY_WEIGHT[b.priority] ?? 0) : 0
      if (pa !== pb) return pb - pa
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.getTime() - b.dueDate.getTime()
    })

    // ── Section NOTES : uniquement les Notes (status OPEN) ──
    const notes = children.filter((e) => e.type === 'NOTE' && e.status === 'OPEN')

    // ── Section COMPLÉTÉS : status DONE ou CANCELLED (toutes sauf NOTE) ──
    const completed = children
      .filter((e) => e.status === 'DONE' || e.status === 'CANCELLED')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

    return NextResponse.json({ open, notes, completed })
  } catch (err) {
    console.error('[GET /api/cerveau/projects/[id]/entries]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
