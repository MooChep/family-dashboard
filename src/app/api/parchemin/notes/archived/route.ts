import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, NoteWithRelations } from '@/lib/parchemin/types'

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const notes = await prisma.parcheminNote.findMany({
      where: { archivedAt: { not: null } },
      include: {
        items:    { orderBy: { order: 'asc' } },
        children: true,
        parent:   true,
      },
      orderBy: { archivedAt: 'desc' },
    })

    return Response.json({ success: true, data: notes } satisfies ApiResponse<NoteWithRelations[]>)
  } catch (error) {
    console.error('[parchemin/notes/archived GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
