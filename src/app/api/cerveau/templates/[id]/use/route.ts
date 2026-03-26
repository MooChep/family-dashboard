import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, EntryWithRelations } from '@/lib/cerveau/types'

// ── Title pattern resolution ───────────────────────────────────────────────

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function resolvePattern(pattern: string): string {
  const now = new Date()
  const day = now.getDate()
  const month = MONTHS_FR[now.getMonth()]
  const year = now.getFullYear()
  const week = getWeekNumber(now)

  return pattern
    .replace('{date}',    `${day} ${month}`)
    .replace('{semaine}', `semaine ${week}`)
    .replace('{mois}',    `${month} ${year}`)
}

// POST /api/cerveau/templates/[id]/use — instanciate template into a real entry
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const template = await prisma.cerveauTemplate.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    if (!template) {
      return Response.json({ success: false, error: 'Template introuvable' } satisfies ApiResponse<never>, { status: 404 })
    }

    const title = resolvePattern(template.titlePattern)

    const entry = await prisma.cerveauEntry.create({
      data: {
        type:        template.type,
        title,
        body:        template.body,
        priority:    template.priority,
        assignedTo:  template.assignedTo,
        tags:        template.tags,
        recurrence:  template.recurrence,
        createdById: session.user.id,
        listItems: template.items.length
          ? { create: template.items.map(item => ({ label: item.label, order: item.order })) }
          : undefined,
      },
      include: {
        listItems: { orderBy: { order: 'asc' } },
        children: true,
        parent: true,
      },
    })

    const data = { ...entry, tags: entry.tags ? (JSON.parse(entry.tags) as string[]) : [] }
    return Response.json({ success: true, data } satisfies ApiResponse<EntryWithRelations>, { status: 201 })
  } catch (error) {
    console.error('[cerveau/templates/:id/use POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
