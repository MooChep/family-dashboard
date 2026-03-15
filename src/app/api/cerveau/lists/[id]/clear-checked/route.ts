import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── POST /api/cerveau/lists/[id]/clear-checked ──

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  const entry = await prisma.entry.findUnique({ where: { id } })
  if (!entry || entry.type !== 'LIST') {
    return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  }

  // Archive tous les items cochés non encore archivés
  const result = await prisma.listItem.updateMany({
    where:  { entryId: id, checked: true, archivedAt: null },
    data:   { archivedAt: new Date() },
  })

  return NextResponse.json({ archived: result.count })
}
