'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatQuantity } from '@/lib/gamelle/units'
import type { RecipeWithIngredients, RecipeStep } from '@/lib/gamelle/types'

interface CuisineModeProps {
  recipe:   RecipeWithIngredients
  portions: number
}

/**
 * Interface plein écran mode cuisine.
 * Affiche les étapes une par une — navigation Précédent / Suivant uniquement.
 * Fond var(--accent), texte blanc, Playfair Display Italic ≥ 24px.
 */
export function CuisineMode({ recipe, portions }: CuisineModeProps) {
  const router    = useRouter()
  const [step, setStep] = useState(0)

  const steps  = recipe.steps
  const total  = steps.length
  const current: RecipeStep | undefined = steps[step]

  const multiplier = recipe.basePortions > 0 ? portions / recipe.basePortions : 1

  // Ingrédients référencés par cette étape
  const stepIngredients = (current?.ingredientRefs ?? [])
    .map(refId => recipe.ingredients.find(i => i.id === refId))
    .filter((i): i is NonNullable<typeof i> => i !== undefined)

  if (total === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-8 text-center gap-4"
        style={{ background: 'var(--accent)' }}
      >
        <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Aucune étape renseignée pour cette recette.
        </p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl font-mono text-sm"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--accent)' }}
    >
      {/* Barre de progression */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.2)' }}>
        <div
          style={{
            height:     '100%',
            width:      `${((step + 1) / total) * 100}%`,
            background: 'rgba(255,255,255,0.8)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.15)',
            color:      '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize:   12,
          }}
        >
          <X size={14} />
          Quitter
        </button>

        <span
          style={{
            color:      'rgba(255,255,255,0.6)',
            fontFamily: 'var(--font-mono)',
            fontSize:   12,
          }}
        >
          {step + 1} / {total}
        </span>
      </div>

      {/* Titre recette */}
      <p
        className="px-5 pb-1 text-center"
        style={{
          color:      'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-display)',
          fontSize:   14,
        }}
      >
        {recipe.title}
      </p>

      {/* Contenu étape */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 overflow-hidden">

        {/* Ingrédients de l'étape */}
        {stepIngredients.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {stepIngredients.map(ing => {
              const qty = ing.displayQuantity > 0
                ? formatQuantity(ing.displayQuantity * multiplier, ing.displayUnit)
                : null

              return (
                <div key={ing.id} className="flex items-center gap-2">
                  {/* Image ou initiale */}
                  <div
                    className="shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    {ing.reference.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ing.reference.imageUrl}
                        alt={ing.reference.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {ing.reference.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div>
                    <p style={{ color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                      {ing.reference.name}
                    </p>
                    {qty && (
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {qty}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Texte de l'étape */}
        <div className="flex-1 flex items-start">
          <p
            style={{
              color:      '#fff',
              fontFamily: 'var(--font-display)',
              fontStyle:  'italic',
              fontSize:   26,
              lineHeight: 1.45,
            }}
          >
            {current?.text ?? ''}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-5 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-mono text-sm font-medium disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', flex: 1, justifyContent: 'center' }}
        >
          <ChevronLeft size={16} />
          Précédent
        </button>

        {step < total - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-mono text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', flex: 1, justifyContent: 'center' }}
          >
            Suivant
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-mono text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', flex: 1, justifyContent: 'center' }}
          >
            Terminer ✓
          </button>
        )}
      </div>
    </div>
  )
}
