import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/parchemin/types'
import type { ParcheminItem } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id: noteId } = await params
  let body: { label: string; order?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.label?.trim()) {
    return Response.json({ success: false, error: 'label est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const item = await prisma.parcheminItem.create({
      data: {
        noteId,
        label:   body.label.trim(),
        order:   body.order ?? 0,
      },
    })

    return Response.json({ success: true, data: item } satisfies ApiResponse<ParcheminItem>, { status: 201 })
  } catch (error) {
    console.error('[parchemin/notes/[id]/items POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
