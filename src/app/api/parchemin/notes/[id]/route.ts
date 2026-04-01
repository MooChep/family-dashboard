import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, NoteWithRelations, UpdateNotePayload } from '@/lib/parchemin/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params

  try {
    const note = await prisma.parcheminNote.findUnique({
      where: { id },
      include: {
        items:    { orderBy: { order: 'asc' } },
        children: true,
        parent:   true,
      },
    })

    if (!note) {
      return Response.json({ success: false, error: 'Note introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>)
  } catch (error) {
    console.error('[parchemin/notes/[id] GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params
  let body: UpdateNotePayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const data: Record<string, unknown> = {}

    if (body.title     !== undefined) data.title     = body.title.trim()
    if (body.format    !== undefined) data.format    = body.format
    if (body.body      !== undefined) data.body      = body.body
    if (body.parentId  !== undefined) data.parentId  = body.parentId
    if (body.pinned    !== undefined) data.pinned    = body.pinned
    if (body.notifAt   !== undefined) data.notifAt   = body.notifAt   ? new Date(body.notifAt)   : null
    if (body.notifTo   !== undefined) data.notifTo   = body.notifTo
    if (body.notifBody !== undefined) data.notifBody = body.notifBody ?? null
    if (body.dueDate   !== undefined) data.dueDate   = body.dueDate   ? new Date(body.dueDate)   : null

    if ('archivedAt' in body) {
      data.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null
    }

    const note = await prisma.parcheminNote.update({
      where: { id },
      data,
      include: {
        items:    { orderBy: { order: 'asc' } },
        children: true,
        parent:   true,
      },
    })

    return Response.json({ success: true, data: note } satisfies ApiResponse<NoteWithRelations>)
  } catch (error) {
    console.error('[parchemin/notes/[id] PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.parcheminNote.update({
      where: { id },
      data:  { archivedAt: new Date() },
    })

    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[parchemin/notes/[id] DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
