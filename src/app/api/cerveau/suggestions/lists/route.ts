import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/cerveau/normalize'
import type { ApiResponse } from '@/lib/cerveau/types'

export type ListSuggestion = {
  id: string
  title: string
  itemCount: number
}

// GET /api/cerveau/suggestions/lists?q=cou
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const q = normalize(request.nextUrl.searchParams.get('q') ?? '')

  const lists = await prisma.cerveauEntry.findMany({
    where: { type: 'LIST', status: 'ACTIVE' },
    include: { _count: { select: { listItems: true } } },
    orderBy: { title: 'asc' },
  })

  const results: ListSuggestion[] = lists
    .filter(l => normalize(l.title).startsWith(q))
    .slice(0, 5)
    .map(l => ({ id: l.id, title: l.title, itemCount: l._count.listItems }))

  return Response.json({ success: true, data: results } satisfies ApiResponse<ListSuggestion[]>)
}
