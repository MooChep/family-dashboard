import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── POST /api/cerveau/entries/[id]/restore ──

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  try {
    const existing = await prisma.entry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
    }

    if (existing.status === 'OPEN') {
      return NextResponse.json({ error: 'Entrée déjà active' }, { status: 422 })
    }

    // Événements dont startDate est déjà passée → PASSED plutôt que OPEN
    const isEventPast =
      existing.type === 'EVENT' &&
      existing.startDate !== null &&
      existing.startDate < new Date()

    const entry = await prisma.entry.update({
      where: { id },
      data: {
        status:     isEventPast ? 'PASSED' : 'OPEN',
        archivedAt: null,
      },
    })

    return NextResponse.json(entry)
  } catch (err) {
    console.error('[POST /api/cerveau/entries/[id]/restore]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
