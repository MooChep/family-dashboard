import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RecipeForm } from '@/components/gamelle/recipes/RecipeForm'
import type { RecipeWithIngredients, RecipeStep } from '@/lib/gamelle/types'

interface Props {
  params: { id: string }
}

/**
 * Page d'édition d'une recette existante.
 * Récupère la recette avec ses ingrédients et passe les données à RecipeForm en mode "edit".
 */
export default async function EditRecettePage({ params }: Props) {
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

  const data: RecipeWithIngredients = {
    ...recipe,
    steps: Array.isArray(recipe.steps) ? (recipe.steps as RecipeStep[]) : [],
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <RecipeForm initialData={data} mode="edit" />
    </div>
  )
}
