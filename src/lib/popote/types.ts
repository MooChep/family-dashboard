import type { Recipe, RecipeIngredient, IngredientReference, Aisle, PlanningSlot, SlotType, Period } from '@prisma/client'

export type { SlotType, Period }

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
  referenceId:     string
  quantity:        number
  displayQuantity: number
  displayUnit:     string
  isOptional?:     boolean
  isStaple?:       boolean
}

// ─── Payload mise à jour recette ──────────────────────────────────────────
export type UpdateRecipePayload = Partial<CreateRecipePayload> & {
  // Remplacement complet des ingrédients si fourni
  ingredients?: CreateRecipeIngredientPayload[]
}

// ─── Planning slot enrichi avec la recette ────────────────────────────────
export type PlanningSlotWithRecipe = PlanningSlot & {
  recipe: Pick<Recipe, 'id' | 'title' | 'imageLocal' | 'basePortions' | 'preparationTime' | 'cookingTime'>
}

// ─── Payload création slot ─────────────────────────────────────────────────
export type CreateSlotPayload = {
  recipeId:      string
  portions?:     number
  scheduledDate?: string   // ISO date string — null → FLOATING
  period?:       Period
}

// ─── Payload mise à jour slot ──────────────────────────────────────────────
export type UpdateSlotPayload = {
  portions?:     number
  scheduledDate?: string | null   // null → passe en FLOATING
  period?:       Period | null
}

// ─── Pagination ────────────────────────────────────────────────────────────
export type PaginatedResponse<T> = {
  data:    T[]
  total:   number
  page:    number
  limit:   number
}
