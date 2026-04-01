import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ApiResponse } from '@/lib/gamelle/types'

const JOW_SCRAPER_URL = process.env.JOW_SCRAPER_URL ?? 'http://jow-scraper:8001'

export type JowSearchResult = {
  id:              string
  name:            string
  url:             string
  imageUrl:        string | null
  description:     string | null
  preparationTime: number | null
  cookingTime:     number | null
  coversCount:     number | null
  ingredients: {
    name:       string
    quantity:   number | null
    unit:       string | null
    isOptional: boolean
  }[]
}

// POST /api/gamelle/import/search
// body: { q: string, limit?: number }
// Relaye la recherche vers le microservice jow-scraper.
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: { q?: string; limit?: number }
  try {
    body = await request.json() as { q?: string; limit?: number }
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  const q = body.q?.trim() ?? ''
  if (!q) {
    return Response.json({ success: false, error: 'q est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  const limit = Math.min(30, Math.max(1, body.limit ?? 10))

  try {
    const scraperRes = await fetch(
      `${JOW_SCRAPER_URL}/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { signal: AbortSignal.timeout(15_000) },
    )

    if (!scraperRes.ok) {
      console.error('[gamelle/import/search] scraper error', scraperRes.status)
      return Response.json({ success: false, error: 'Microservice indisponible' } satisfies ApiResponse<never>, { status: 502 })
    }

    const results = await scraperRes.json() as JowSearchResult[]
    return Response.json({ success: true, data: results } satisfies ApiResponse<JowSearchResult[]>)
  } catch (error) {
    console.error('[gamelle/import/search]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
