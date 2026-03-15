import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/cerveau/lists/[id]/items ──

export async function GET(
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

  // Items non cochés ASC addedAt, cochés DESC checkedAt
  const [unchecked, checked] = await Promise.all([
    prisma.listItem.findMany({
      where:   { entryId: id, checked: false, archivedAt: null },
      orderBy: { addedAt: 'asc' },
    }),
    prisma.listItem.findMany({
      where:   { entryId: id, checked: true, archivedAt: null },
      orderBy: { checkedAt: 'desc' },
    }),
  ])

  return NextResponse.json([...unchecked, ...checked])
}

// ── POST /api/cerveau/lists/[id]/items ──

interface PostBody {
  content:   string
  quantity?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  let body: PostBody
  try {
    body = await request.json() as PostBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
  }

  const entry = await prisma.entry.findUnique({ where: { id } })
  if (!entry || entry.type !== 'LIST') {
    return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  }

  const item = await prisma.listItem.create({
    data: {
      entryId:   id,
      content:   body.content.trim(),
      quantity:  body.quantity?.trim() ?? null,
      addedById: session.user.id,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
