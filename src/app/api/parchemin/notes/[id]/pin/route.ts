import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, NoteWithRelations } from '@/lib/parchemin/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.parcheminNote.findUnique({ where: { id }, select: { pinned: true } })
    if (!existing) {
      return Response.json({ success: false, error: 'Note introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    const note = await prisma.parcheminNote.update({
      where: { id },
      data:  { pinned: !existing.pinned },
      include: {
        items:    { orderBy: { order: 'asc' } },
        children: true,
        parent:   true,
      },
    })

    return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>)
  } catch (error) {
    console.error('[parchemin/notes/[id]/pin POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
