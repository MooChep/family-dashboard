import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, EntryWithRelations, CreateEntryPayload } from '@/lib/cerveau/types'

// GET /api/cerveau/entries — liste les entries
// ?status=ARCHIVED&status=DONE pour l'archive ; sinon retourne ACTIVE + SNOOZED
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parentId = searchParams.get('parentId')
  const typeFilter = searchParams.get('type') as import('@prisma/client').EntryType | null
  const requestedStatuses = searchParams.getAll('status') as import('@prisma/client').EntryStatus[]
  const statuses = requestedStatuses.length > 0
    ? requestedStatuses
    : (['ACTIVE', 'SNOOZED'] as import('@prisma/client').EntryStatus[])

  try {
    const entries = await prisma.cerveauEntry.findMany({
      where: parentId
        ? { parentId }
        : { parentId: null, status: { in: statuses }, ...(typeFilter ? { type: typeFilter } : {}) },
      include: {
        listItems: { orderBy: { order: 'asc' } },
        children: true,
        parent: true,
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    const parsed = entries.map(e => ({ ...e, tags: e.tags ? (JSON.parse(e.tags) as string[]) : [] }))
    return Response.json({ success: true, data: parsed } satisfies ApiResponse<EntryWithRelations[]>)
  } catch (error) {
    console.error('[cerveau/entries GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// POST /api/cerveau/entries — crée une nouvelle entry
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: CreateEntryPayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.type || !body.title?.trim()) {
    return Response.json({ success: false, error: 'type et title sont requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const entry = await prisma.cerveauEntry.create({
      data: {
        type: body.type,
        title: body.title.trim(),
        body: body.body,
        priority: body.priority,
        assignedTo: body.assignedTo ?? 'BOTH',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        remindAt: body.remindAt ? new Date(body.remindAt) : undefined,
        parentId: body.parentId,
        tags: body.tags ? JSON.stringify(body.tags) : undefined,
        recurrence: body.recurrence,
        createdById: session.user.id,
        listItems: body.listItems?.length
          ? {
              create: body.listItems.map((label, index) => ({ label, order: index })),
            }
          : undefined,
      },
      include: {
        listItems: { orderBy: { order: 'asc' } },
        children: true,
        parent: true,
      },
    })

    const withParsedTags = { ...entry, tags: entry.tags ? (JSON.parse(entry.tags) as string[]) : [] }
    return Response.json({ success: true, data: withParsedTags } satisfies ApiResponse<EntryWithRelations>, { status: 201 })
  } catch (error) {
    console.error('[cerveau/entries POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
