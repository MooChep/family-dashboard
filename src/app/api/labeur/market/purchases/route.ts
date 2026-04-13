import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, PaginatedResponse } from '@/lib/labeur/types'

// ─── GET /api/labeur/market/purchases ─────────────────────────────────────────
// Historique des achats finalisés (isComplete = true).
// ?userId=xxx  → filtrer sur un membre spécifique
// ?page=1&limit=20 → pagination
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
    const where = {
      isComplete: true,
      ...(userId ? { userId } : {}),
    }

    const [purchases, total] = await Promise.all([
      prisma.labeurPurchase.findMany({
        where,
        include: {
          item: {
            select: { id: true, title: true, type: true, ecuPrice: true },
          },
          user: { select: { id: true, name: true } },
        },
        orderBy: { purchasedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.labeurPurchase.count({ where }),
    ])

    const response: PaginatedResponse<typeof purchases[number]> = {
      data:  purchases,
      total,
      page,
      limit,
    }

    return Response.json({ success: true, data: response } satisfies ApiResponse<typeof response>)
  } catch (e) {
    console.error('[GET /api/labeur/market/purchases]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
