import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type EntryStatus, type EntryPriority, type EntryAssignee } from '@prisma/client'

// ── Types ──

interface PatchBody {
  status?:      EntryStatus
  priority?:    EntryPriority | null
  isPinned?:    boolean
  content?:     string
  description?: string | null
  isUrgent?:    boolean
  dueDate?:     string | null
  assignedTo?:  EntryAssignee
  // ─── Événement ───────────────────────────────────────────
  startDate?:   string | null
  endDate?:     string | null
  location?:    string | null
  allDay?:      boolean
}

// ── GET /api/cerveau/entries/[id] ──

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const entry = await prisma.entry.findUnique({
    where: { id: params.id },
    select: {
      id:         true,
      type:       true,
      content:    true,
      status:     true,
      assignedTo: true,
      dueDate:    true,
      updatedAt:  true,
    },
  })

  if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
  return NextResponse.json(entry)
}

// ── PATCH /api/cerveau/entries/[id] ──

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

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
    const entry = await prisma.entry.update({
      where: { id },
      data: {
        ...(body.status      !== undefined && { status:      body.status }),
        ...(body.priority    !== undefined && { priority:    body.priority }),
        ...(body.isPinned    !== undefined && { isPinned:    body.isPinned }),
        ...(body.content     !== undefined && { content:     body.content.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isUrgent    !== undefined && { isUrgent:    body.isUrgent }),
        ...(body.assignedTo  !== undefined && { assignedTo:  body.assignedTo }),
        ...(body.dueDate     !== undefined && { dueDate:    body.dueDate    ? new Date(body.dueDate)    : null }),
        ...(body.startDate   !== undefined && { startDate:  body.startDate  ? new Date(body.startDate)  : null }),
        ...(body.endDate     !== undefined && { endDate:    body.endDate    ? new Date(body.endDate)    : null }),
        ...(body.location    !== undefined && { location:   body.location }),
        ...(body.allDay      !== undefined && { allDay:     body.allDay }),
        ...(['DONE', 'CANCELLED', 'ARCHIVED', 'PASSED'].includes(body.status ?? '')
          ? { archivedAt: new Date() }
          : {}),
      },
    })

    return NextResponse.json(entry)
  } catch (err) {
    console.error('[PATCH /api/cerveau/entries/[id]]', err)
    return NextResponse.json({ error: 'Entrée introuvable ou erreur serveur' }, { status: 404 })
  }
}

// ── DELETE /api/cerveau/entries/[id] ──

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  const entry = await prisma.entry.findUnique({ where: { id }, select: { status: true } })
  if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
  if (entry.status === 'OPEN') {
    return NextResponse.json({ error: 'Impossible de supprimer une entrée active' }, { status: 422 })
  }

  try {
    await prisma.entry.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/cerveau/entries/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
