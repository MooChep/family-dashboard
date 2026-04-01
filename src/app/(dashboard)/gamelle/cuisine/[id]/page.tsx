import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CuisineMode } from '@/components/gamelle/cuisine/CuisineMode'
import type { RecipeStep } from '@/lib/gamelle/types'

interface Props {
  params:      { id: string }
  searchParams: { portions?: string }
}

/**
 * Page mode cuisine plein écran.
 * Route : /gamelle/cuisine/[id]?portions=N
 * Accessible depuis RecipeDetail (bouton "Cuisiner").
 */
export default async function CuisinePage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const recipe = await prisma.recipe.findUnique({
    where:   { id: params.id },
    include: {
      ingredients: {
        include: { reference: { include: { aisle: true } } },
      },
    },
  })

  if (!recipe) notFound()

  const rawSteps = Array.isArray(recipe.steps)
    ? (recipe.steps as RecipeStep[])
    : []

  const portionsParam = parseInt(searchParams.portions ?? '', 10)
  const portions      = !isNaN(portionsParam) && portionsParam > 0
    ? portionsParam
    : recipe.basePortions

  // Sérialisation pour passage au client component
  const recipeData = {
    ...recipe,
    steps: rawSteps,
  }

  return <CuisineMode recipe={recipeData} portions={portions} />
}
