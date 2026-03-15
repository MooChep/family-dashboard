import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── PATCH /api/cerveau/lists/[id]/items/[itemId] ──

interface PatchBody {
  content?:  string
  quantity?: string
  checked?:  boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { itemId } = params

  let body: PatchBody
  try {
    body = await request.json() as PatchBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 })
  }

  try {
    const item = await prisma.listItem.update({
      where: { id: itemId },
      data: {
        ...(body.content  !== undefined && { content:  body.content.trim() }),
        ...(body.quantity !== undefined && { quantity: body.quantity?.trim() ?? null }),
        ...(body.checked  !== undefined && {
          checked:     body.checked,
          checkedById: body.checked ? session.user.id : null,
          checkedAt:   body.checked ? new Date() : null,
        }),
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
  }
}

// ── DELETE /api/cerveau/lists/[id]/items/[itemId] ──

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { itemId } = params

  try {
    await prisma.listItem.delete({ where: { id: itemId } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
  }
}
