'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, UtensilsCrossed, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatQuantity } from '@/lib/gamelle/units'
import type { RecipeWithIngredients, RecipeStep } from '@/lib/gamelle/types'

interface CuisineModeProps {
  recipe:   RecipeWithIngredients
  portions: number
}

type EndStep = 'idle' | 'loading' | 'warnings'

/**
 * Interface plein écran mode cuisine.
 * Affiche les étapes une par une — navigation Précédent / Suivant.
 * Fond var(--accent), texte blanc, Playfair Display Italic ≥ 24px.
 * En haut à droite : toggle liste des ingrédients.
 * Dernière étape : deux boutons "Terminer" et "Terminer et consommer les portions".
 */
export function CuisineMode({ recipe, portions }: CuisineModeProps) {
  const router = useRouter()
  const [step,             setStep]             = useState(0)
  const [showIngredients,  setShowIngredients]  = useState(false)
  const [endStep,          setEndStep]          = useState<EndStep>('idle')
  const [warnings,         setWarnings]         = useState<string[]>([])

  const steps      = recipe.steps
  const total      = steps.length
  const current: RecipeStep | undefined = steps[step]
  const isLastStep = step === total - 1

  const multiplier = recipe.basePortions > 0 ? portions / recipe.basePortions : 1

  // Ingrédients référencés par cette étape
  const stepIngredients = (current?.ingredientRefs ?? [])
    .map(refId => recipe.ingredients.find(i => i.id === refId))
    .filter((i): i is NonNullable<typeof i> => i !== undefined)

  // Tous les ingrédients actifs pour le panel
  const allIngredients = recipe.ingredients.filter(i => !i.isIgnored)

  async function handleConsumeAndFinish() {
    setEndStep('loading')
    try {
      const res  = await fetch('/api/gamelle/inventory/deduct', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipeId: recipe.id, portions }),
      })
      const data = await res.json() as { warnings?: string[]; error?: string }
      if (!res.ok) {
        // Erreur serveur — on quand même retourner
        router.back()
        return
      }
      const w = data.warnings ?? []
      if (w.length > 0) {
        setWarnings(w)
        setEndStep('warnings')
      } else {
        router.back()
      }
    } catch {
      router.back()
    }
  }

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
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--accent)' }}>

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
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12 }}
        >
          <X size={14} />
          Quitter
        </button>

        <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {step + 1} / {total}
        </span>

        {/* Toggle ingrédients */}
        <button
          onClick={() => setShowIngredients(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            background: showIngredients ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
            color:      '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize:   12,
          }}
        >
          <UtensilsCrossed size={14} />
          Ingrédients
        </button>
      </div>

      {/* Titre recette */}
      <p
        className="px-5 pb-1 text-center"
        style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-display)', fontSize: 14 }}
      >
        {recipe.title}
      </p>

      {/* Panel ingrédients — overlay */}
      {showIngredients && (
        <div
          className="mx-4 mb-4 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Ingrédients · {portions} portion{portions > 1 ? 's' : ''}
            </span>
            <button onClick={() => setShowIngredients(false)} style={{ color: 'rgba(255,255,255,0.5)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {allIngredients.map(ing => {
              const qty = ing.displayQuantity > 0
                ? formatQuantity(ing.displayQuantity * multiplier, ing.displayUnit)
                : null
              return (
                <div key={ing.id} className="flex items-center justify-between px-4 py-2">
                  <span style={{ color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                    {ing.reference.name}
                    {ing.isStaple && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: 4 }}>staple</span>
                    )}
                  </span>
                  {qty && (
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {qty}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                  <div
                    className="shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    {ing.reference.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ing.reference.imageUrl} alt={ing.reference.name} className="w-full h-full object-cover" />
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
          <p style={{ color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, lineHeight: 1.45 }}>
            {current?.text ?? ''}
          </p>
        </div>
      </div>

      {/* Navigation — pb-24 pour le BottomNav */}
      <div
        className="flex flex-col gap-2 px-5 pt-2 pb-32 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Ligne précédent / suivant */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-mono text-sm font-medium disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', flex: 1, justifyContent: 'center' }}
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          {!isLastStep && (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-mono text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', flex: 1, justifyContent: 'center' }}
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Boutons de fin — uniquement sur la dernière étape */}
        {isLastStep && endStep === 'idle' && (
          <>
            <button
              onClick={() => router.back()}
              className="w-full py-3 rounded-2xl font-mono text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              Terminer sans consommer
            </button>
            <button
              onClick={() => void handleConsumeAndFinish()}
              className="w-full py-3 rounded-2xl font-mono text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              <CheckCircle2 size={16} />
              Terminer et consommer les portions
            </button>
          </>
        )}

        {isLastStep && endStep === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center' }}>
            Mise à jour du stock…
          </p>
        )}

        {isLastStep && endStep === 'warnings' && (
          <div className="flex flex-col gap-2">
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }} />
              <p style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                Certains ingrédients n'ont pas pu être déduits du stock.
              </p>
            </div>
            {warnings.map((w, i) => (
              <p key={i} style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
                · {w}
              </p>
            ))}
            <button
              onClick={() => router.back()}
              className="w-full py-3 rounded-2xl font-mono text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
            >
              <CheckCircle2 size={16} />
              Compris
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
