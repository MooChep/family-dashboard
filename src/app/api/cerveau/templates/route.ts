import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { AssignedTo, EntryType, Priority } from '@prisma/client'

export type TemplateSummary = {
  id:           string
  name:         string
  shortcut:     string | null
  type:         EntryType
  titlePattern: string
  body:         string | null
  priority:     Priority | null
  assignedTo:   AssignedTo
  tags:         string[]
  recurrence:   string | null
  items:        { id: string; label: string; order: number }[]
  createdAt:    string
}

type CreateTemplatePayload = {
  name:         string
  shortcut?:    string
  type:         EntryType
  titlePattern: string
  body?:        string
  priority?:    Priority
  assignedTo?:  AssignedTo
  tags?:        string[]
  recurrence?:  string
  items?:       string[]
}

function serializeTemplate(t: {
  id: string; name: string; shortcut: string | null; type: EntryType
  titlePattern: string; body: string | null; priority: Priority | null
  assignedTo: AssignedTo; tags: string | null; recurrence: string | null
  createdAt: Date
  items: { id: string; label: string; order: number }[]
}): TemplateSummary {
  return {
    ...t,
    tags: t.tags ? (JSON.parse(t.tags) as string[]) : [],
    createdAt: t.createdAt.toISOString(),
  }
}

// GET /api/cerveau/templates
export async function GET(_request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const templates = await prisma.cerveauTemplate.findMany({
      where: { createdById: session.user.id },
      include: { items: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ success: true, data: templates.map(serializeTemplate) } satisfies ApiResponse<TemplateSummary[]>)
  } catch (error) {
    console.error('[cerveau/templates GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// POST /api/cerveau/templates
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: CreateTemplatePayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.name?.trim() || !body.type || !body.titlePattern?.trim()) {
    return Response.json({ success: false, error: 'name, type et titlePattern sont requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const template = await prisma.cerveauTemplate.create({
      data: {
        name:         body.name.trim(),
        shortcut:     body.shortcut?.trim() || null,
        type:         body.type,
        titlePattern: body.titlePattern.trim(),
        body:         body.body,
        priority:     body.priority,
        assignedTo:   body.assignedTo ?? 'BOTH',
        tags:         body.tags?.length ? JSON.stringify(body.tags) : null,
        recurrence:   body.recurrence,
        createdById:  session.user.id,
        items: body.items?.length
          ? { create: body.items.map((label, order) => ({ label, order })) }
          : undefined,
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })
    return Response.json({ success: true, data: serializeTemplate(template) } satisfies ApiResponse<TemplateSummary>, { status: 201 })
  } catch (error) {
    console.error('[cerveau/templates POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
