import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalize } from '@/lib/cerveau/normalize'
import type { ApiResponse } from '@/lib/cerveau/types'

export type ProjectSuggestion = {
  id: string
  title: string
  childrenCount: number
}

// GET /api/cerveau/suggestions/projects?q=voy
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const q = normalize(request.nextUrl.searchParams.get('q') ?? '')

  const projects = await prisma.cerveauEntry.findMany({
    where: { type: 'PROJECT', status: 'ACTIVE' },
    include: { _count: { select: { children: true } } },
    orderBy: { title: 'asc' },
  })

  const results: ProjectSuggestion[] = projects
    .filter(p => normalize(p.title).startsWith(q))
    .slice(0, 5)
    .map(p => ({ id: p.id, title: p.title, childrenCount: p._count.children }))

  return Response.json({ success: true, data: results } satisfies ApiResponse<ProjectSuggestion[]>)
}
