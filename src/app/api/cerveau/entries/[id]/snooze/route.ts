import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, EntryWithRelations } from '@/lib/cerveau/types'

// POST /api/cerveau/entries/[id]/snooze — body: { until: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: { until: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.until) {
    return Response.json({ success: false, error: 'until est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const entry = await prisma.cerveauEntry.update({
      where: { id: params.id },
      data: {
        status:            'SNOOZED',
        snoozedUntil:      new Date(body.until),
        notificationCount: 0,
        lastNotifiedAt:    null,
      },
      include: {
        listItems: { orderBy: { order: 'asc' } },
        children: true,
        parent: true,
      },
    })

    const data = { ...entry, tags: entry.tags ? (JSON.parse(entry.tags) as string[]) : [] }
    return Response.json({ success: true, data } satisfies ApiResponse<EntryWithRelations>)
  } catch (error) {
    console.error('[cerveau/entries/:id/snooze POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
