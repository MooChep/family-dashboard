import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { downloadAndCompressImage, generateImageFilename } from '@/lib/popote/image'
import type { ApiResponse, RecipeStep } from '@/lib/popote/types'
import type { JowSearchResult } from '../search/route'

const JOW_SCRAPER_URL = process.env.JOW_SCRAPER_URL ?? 'http://jow-scraper:8001'

/** Statut de correspondance d'un ingrédient Jow avec le dictionnaire. */
export type IngredientMatchStatus =
  | { matched: true;  referenceId: string; referenceName: string }
  | { matched: false }

/** Ingrédient Jow enrichi avec son statut de matching dictionnaire. */
export type ImportIngredient = JowSearchResult['ingredients'][number] & {
  jowIndex:    number             // position dans la liste Jow (stable key)
  matchStatus: IngredientMatchStatus
}

/** Payload retourné par la route fetch — pré-remplissage du formulaire. */
export type ImportFetchResult = {
  jowId:           string
  title:           string
  description:     string | null
  imageLocal:      string          // nom du fichier WebP stocké localement, ou '' si échec
  preparationTime: number | null
  cookingTime:     number | null
  basePortions:    number
  calories:        number | null
  sourceUrl:       string
  steps:           RecipeStep[]
  scrapeError:     boolean
  ingredients:     ImportIngredient[]
}

// POST /api/popote/import/fetch
// body: données complètes de la recette Jow (issues de /import/search)
// Scrape les étapes via le microservice, matche les ingrédients au dictionnaire,
// télécharge et compresse l'image. Retourne un payload de pré-remplissage.
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: JowSearchResult
  try {
    body = await request.json() as JowSearchResult
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.url || !body.id) {
    return Response.json({ success: false, error: 'url et id sont requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  // ── 1. Scraping des étapes (microservice) ─────────────────────────────────
  let steps: RecipeStep[] = []
  let scrapeError = false

  try {
    const scraperRes = await fetch(`${JOW_SCRAPER_URL}/fetch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: body.url }),
      signal:  AbortSignal.timeout(20_000),
    })

    if (scraperRes.ok) {
      const payload = await scraperRes.json() as { steps: RecipeStep[]; scrapeError: boolean }
      steps = payload.steps ?? []
      scrapeError = payload.scrapeError ?? false
    } else {
      scrapeError = true
    }
  } catch {
    scrapeError = true
  }

  // ── 2. Download + compression WebP de l'image ────────────────────────────
  let imageLocal = ''

  if (body.imageUrl) {
    try {
      const filename = generateImageFilename(body.name ?? body.id)
      imageLocal = await downloadAndCompressImage(body.imageUrl, filename)
    } catch (err) {
      console.warn('[popote/import/fetch] image download failed', err)
    }
  }

  // ── 3. Matching des ingrédients avec le dictionnaire ─────────────────────
  // Recherche case-insensitive + trim, correspondance stricte sur le nom.
  const names = body.ingredients.map(ing => ing.name.trim().toLowerCase())

  const references = await prisma.ingredientReference.findMany({
    where: {
      name: { in: body.ingredients.map(ing => ing.name.trim()) },
    },
    select: { id: true, name: true },
  })

  // Index par nom normalisé pour lookup O(1)
  const refByName = new Map(references.map(r => [r.name.toLowerCase(), r]))

  const ingredients: ImportIngredient[] = body.ingredients.map((ing, index) => {
    const key = names[index]
    const ref = refByName.get(key ?? '')

    return {
      ...ing,
      jowIndex: index,
      matchStatus: ref
        ? { matched: true, referenceId: ref.id, referenceName: ref.name }
        : { matched: false },
    }
  })

  // ── 4. Construction du payload de pré-remplissage ─────────────────────────
  const result: ImportFetchResult = {
    jowId:           body.id,
    title:           body.name ?? '',
    description:     body.description ?? null,
    imageLocal,
    preparationTime: body.preparationTime ?? null,
    cookingTime:     body.cookingTime ?? null,
    basePortions:    1,
    calories:        null,
    sourceUrl:       body.url,
    steps,
    scrapeError,
    ingredients,
  }

  return Response.json({ success: true, data: result } satisfies ApiResponse<ImportFetchResult>)
}
