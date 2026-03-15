import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type EntryType, type EntryAssignee } from '@prisma/client'

// ── GET /api/cerveau/archive ──

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const typeParam  = searchParams.get('type')
  const userParam  = searchParams.get('user')
  const period     = searchParams.get('period') ?? '30d'
  const cursor     = searchParams.get('cursor') ?? undefined
  const limit      = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  // ── Filtre de période ──
  let dateFilter: Date | undefined
  const now = new Date()
  if (period === '7d') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (period === '30d') {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  } else if (period === '3m') {
    dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  }

  const assigneeFilter: EntryAssignee | undefined =
    userParam === 'ilan'    ? 'ILAN'    :
    userParam === 'camille' ? 'CAMILLE' : undefined

  try {
    const entries = await prisma.entry.findMany({
      where: {
        authorId:  session.user.id,
        status:    { not: 'OPEN' },
        type:      {
          not: 'DISCUSSION',
          ...(typeParam ? { equals: typeParam as EntryType } : {}),
        },
        ...(assigneeFilter ? { assignedTo: assigneeFilter } : {}),
        ...(dateFilter ? {
          OR: [
            { archivedAt: { gte: dateFilter } },
            { archivedAt: null, updatedAt: { gte: dateFilter } },
          ],
        } : {}),
      },
      orderBy: [
        { archivedAt: 'desc' },
        { updatedAt:  'desc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id:         true,
        type:       true,
        content:    true,
        status:     true,
        assignedTo: true,
        archivedAt: true,
        updatedAt:  true,
        startDate:  true,
      },
    })

    const hasMore    = entries.length > limit
    if (hasMore) entries.pop()

    const nextCursor = hasMore ? (entries[entries.length - 1]?.id ?? null) : null

    return NextResponse.json({ entries, nextCursor })
  } catch (err) {
    console.error('[GET /api/cerveau/archive]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
