import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { downloadAndCompressImage, generateImageFilename } from '@/lib/gamelle/image'
import type { ApiResponse, RecipeStep } from '@/lib/gamelle/types'
import type { JowSearchResult } from '../search/route'

const JOW_SCRAPER_URL = process.env.JOW_SCRAPER_URL ?? 'http://jow-scraper:8001'

/** Statut de correspondance d'un ingrédient Jow avec le dictionnaire. */
export type IngredientMatchStatus =
  | { matched: true;  referenceId: string; referenceName: string; via: 'dict' | 'sub' }
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

// POST /api/gamelle/import/fetch
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
      console.log('[gamelle/import/fetch] image download start:', body.imageUrl)
      imageLocal = await downloadAndCompressImage(body.imageUrl, filename)
      console.log('[gamelle/import/fetch] image download done → local:', imageLocal)
    } catch (err) {
      console.warn('[gamelle/import/fetch] image download failed', err)
    }
  }

  // ── 3. Matching des ingrédients — cascade de résolution ──────────────────
  // 1. Correspondance exacte dictionnaire (case-insensitive)
  // 2. SubstitutionRule existante
  // 3. Inconnu → remonte dans l'interface
  const ingNames = body.ingredients.map(ing => ing.name.trim())
  const ingNamesLower = ingNames.map(n => n.toLowerCase())

  const [references, subRules] = await Promise.all([
    prisma.ingredientReference.findMany({
      where: { name: { in: ingNames } },
      select: { id: true, name: true },
    }),
    prisma.substitutionRule.findMany({
      where: { jowName: { in: ingNames } },
      select: { jowName: true, referenceId: true, reference: { select: { name: true } } },
    }),
  ])

  const refByName  = new Map(references.map(r => [r.name.toLowerCase(), r]))
  const subByName  = new Map(subRules.map(s => [s.jowName.toLowerCase(), s]))

  const ingredients: ImportIngredient[] = body.ingredients.map((ing, index) => {
    const key = ingNamesLower[index] ?? ''
    const ref = refByName.get(key)
    const sub = subByName.get(key)

    if (ref) {
      return { ...ing, jowIndex: index, matchStatus: { matched: true, referenceId: ref.id, referenceName: ref.name, via: 'dict' as const } }
    }
    if (sub) {
      return { ...ing, jowIndex: index, matchStatus: { matched: true, referenceId: sub.referenceId, referenceName: sub.reference.name, via: 'sub' as const } }
    }
    return { ...ing, jowIndex: index, matchStatus: { matched: false } }
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
