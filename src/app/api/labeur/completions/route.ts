import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, PaginatedResponse } from '@/lib/labeur/types'

// ─── GET /api/labeur/completions ──────────────────────────────────────────────
// Historique des réalisations de tâches, toutes instances confondues.
// ?userId=xxx  → filtrer sur un membre
// ?limit=5&page=1 → pagination
export async function GET(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId') ?? undefined
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const skip   = (page - 1) * limit

  try {
    const where = userId ? { userId } : {}

    const [completions, total] = await Promise.all([
      prisma.labeurCompletion.findMany({
        where,
        include: {
          task: { select: { id: true, title: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.labeurCompletion.count({ where }),
    ])

    const response: PaginatedResponse<typeof completions[number]> = {
      data:  completions,
      total,
      page,
      limit,
    }

    return Response.json({ success: true, data: response } satisfies ApiResponse<typeof response>)
  } catch (e) {
    console.error('[GET /api/labeur/completions]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
