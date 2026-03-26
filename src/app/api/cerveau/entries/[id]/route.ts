import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, EntryWithRelations, UpdateEntryPayload } from '@/lib/cerveau/types'

// GET /api/cerveau/entries/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const entry = await prisma.cerveauEntry.findUnique({
      where: { id: params.id },
      include: {
        listItems: { orderBy: { order: 'asc' } },
        children: true,
        parent: true,
      },
    })

    if (!entry) {
      return Response.json({ success: false, error: 'Entry introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    const data = { ...entry, tags: entry.tags ? (JSON.parse(entry.tags) as string[]) : [] }
    return Response.json({ success: true, data } satisfies ApiResponse<EntryWithRelations>)
  } catch (error) {
    console.error('[cerveau/entries/:id GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// PATCH /api/cerveau/entries/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: UpdateEntryPayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const entry = await prisma.cerveauEntry.update({
      where: { id: params.id },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.body !== undefined && { body: body.body }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.pinned !== undefined && { pinned: body.pinned }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.remindAt !== undefined && { remindAt: body.remindAt ? new Date(body.remindAt) : null }),
        ...(body.snoozedUntil !== undefined && { snoozedUntil: body.snoozedUntil ? new Date(body.snoozedUntil) : null }),
        ...(body.parentId   !== undefined && { parentId:   body.parentId }),
        ...(body.tags       !== undefined && { tags:       JSON.stringify(body.tags) }),
        ...(body.recurrence !== undefined && { recurrence: body.recurrence ?? null }),
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
    console.error('[cerveau/entries/:id PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// DELETE /api/cerveau/entries/[id] — soft delete (archive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const entry = await prisma.cerveauEntry.update({
      where: { id: params.id },
      data: {
        status:            'ARCHIVED',
        archivedAt:        new Date(),
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
    console.error('[cerveau/entries/:id DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
