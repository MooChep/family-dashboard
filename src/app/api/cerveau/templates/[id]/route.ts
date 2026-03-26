import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { AssignedTo, EntryType, Priority } from '@prisma/client'

type UpdateTemplatePayload = {
  name?:         string
  shortcut?:     string | null
  type?:         EntryType
  titlePattern?: string
  body?:         string
  priority?:     Priority | null
  assignedTo?:   AssignedTo
  tags?:         string[]
  recurrence?:   string | null
  items?:        string[]
}

// PATCH /api/cerveau/templates/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: UpdateTemplatePayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const existing = await prisma.cerveauTemplate.findUnique({ where: { id: params.id } })
    if (!existing || existing.createdById !== session.user.id) {
      return Response.json({ success: false, error: 'Introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    const template = await prisma.cerveauTemplate.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined        && { name:         body.name.trim() }),
        ...(body.shortcut !== undefined    && { shortcut:     body.shortcut?.trim() || null }),
        ...(body.type !== undefined        && { type:         body.type }),
        ...(body.titlePattern !== undefined && { titlePattern: body.titlePattern.trim() }),
        ...(body.body !== undefined        && { body:         body.body }),
        ...(body.priority !== undefined    && { priority:     body.priority }),
        ...(body.assignedTo !== undefined  && { assignedTo:   body.assignedTo }),
        ...(body.tags !== undefined        && { tags:         body.tags.length ? JSON.stringify(body.tags) : null }),
        ...(body.recurrence !== undefined  && { recurrence:   body.recurrence }),
        ...(body.items !== undefined && {
          items: {
            deleteMany: {},
            create: body.items.map((label, order) => ({ label, order })),
          },
        }),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    const data = { ...template, tags: template.tags ? (JSON.parse(template.tags) as string[]) : [], createdAt: template.createdAt.toISOString() }
    return Response.json({ success: true, data } satisfies ApiResponse<typeof data>)
  } catch (error) {
    console.error('[cerveau/templates/:id PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// DELETE /api/cerveau/templates/[id] — hard delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const existing = await prisma.cerveauTemplate.findUnique({ where: { id: params.id } })
    if (!existing || existing.createdById !== session.user.id) {
      return Response.json({ success: false, error: 'Introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    await prisma.cerveauTemplate.delete({ where: { id: params.id } })
    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[cerveau/templates/:id DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
