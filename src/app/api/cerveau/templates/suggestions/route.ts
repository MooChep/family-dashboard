import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/cerveau/normalize'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { EntryType } from '@prisma/client'

export type TemplateSuggestion = {
  id:       string
  name:     string
  shortcut: string | null
  type:     EntryType
  itemCount: number
}

// GET /api/cerveau/templates/suggestions?q=rev
// Prefix match on normalized shortcut OR name — returns max 5
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const q = normalize(new URL(request.url).searchParams.get('q') ?? '')

  try {
    const all = await prisma.cerveauTemplate.findMany({
      where: { createdById: session.user.id },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const filtered = q.length === 0
      ? all
      : all.filter(t => {
          const normShortcut = normalize(t.shortcut ?? '')
          const normName = normalize(t.name)
          return normShortcut.startsWith(q) || normName.startsWith(q)
        })

    const data: TemplateSuggestion[] = filtered.slice(0, 5).map(t => ({
      id:        t.id,
      name:      t.name,
      shortcut:  t.shortcut,
      type:      t.type,
      itemCount: t._count.items,
    }))

    return Response.json({ success: true, data } satisfies ApiResponse<TemplateSuggestion[]>)
  } catch (error) {
    console.error('[cerveau/templates/suggestions GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
