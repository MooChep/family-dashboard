import type { Recipe, RecipeIngredient, IngredientReference, Aisle } from '@prisma/client'

// ─── Réponse API générique ─────────────────────────────────────────────────
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

// ─── Étape d'une recette ───────────────────────────────────────────────────
export type RecipeStep = {
  order:          number
  text:           string
  ingredientRefs: string[]  // IDs RecipeIngredient
}

// ─── Ingrédient enrichi avec sa référence et son rayon ────────────────────
export type RecipeIngredientWithReference = RecipeIngredient & {
  reference: IngredientReference & { aisle: Aisle }
}

// ─── Recette complète avec ingrédients ────────────────────────────────────
export type RecipeWithIngredients = Omit<Recipe, 'steps'> & {
  steps:       RecipeStep[]
  ingredients: RecipeIngredientWithReference[]
}

// ─── Payload création recette ──────────────────────────────────────────────
export type CreateRecipePayload = {
  title:           string
  description?:    string
  imageLocal?:     string
  preparationTime?: number
  cookingTime?:    number
  basePortions?:   number
  calories?:       number
  utensils?:       string
  steps?:          RecipeStep[]
  sourceUrl?:      string
  jowId?:          string
  ingredients?:    CreateRecipeIngredientPayload[]
}

export type CreateRecipeIngredientPayload = {
  referenceId: string
  quantity:    number
  displayUnit: string
  isOptional?: boolean
  isStaple?:   boolean
}

// ─── Payload mise à jour recette ──────────────────────────────────────────
export type UpdateRecipePayload = Partial<CreateRecipePayload> & {
  // Remplacement complet des ingrédients si fourni
  ingredients?: CreateRecipeIngredientPayload[]
}

// ─── Pagination ────────────────────────────────────────────────────────────
export type PaginatedResponse<T> = {
  data:    T[]
  total:   number
  page:    number
  limit:   number
}
