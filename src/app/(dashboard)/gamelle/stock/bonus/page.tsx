'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AddToMenuSheet } from '@/components/gamelle/planning/AddToMenuSheet'
import type { FeasibleRecipe } from '@/app/api/gamelle/recipes/feasible/route'
import type { ApiResponse, PlanningSlotWithRecipe } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

export default function BonusPage() {
  const router = useRouter()
  const [recipes,  setRecipes]  = useState<FeasibleRecipe[]>([])
  const [loading,  setLoading]  = useState(true)
  const [addRecipe, setAddRecipe] = useState<FeasibleRecipe | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/gamelle/recipes/feasible')
        const json = await res.json() as ApiResponse<FeasibleRecipe[]>
        if (json.success) setRecipes(json.data ?? [])
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    })()
  }, [])

  const lvl1 = recipes.filter(r => r.level === 1)
  const lvl2 = recipes.filter(r => r.level === 2)

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} className="p-1" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        <h1 className="flex-1 font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Recettes réalisables
        </h1>
      </div>

      {loading ? (
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <Sparkles size={40} style={{ color: 'var(--border2)' }} />
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
            Aucune recette réalisable
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
            Votre stock ne couvre aucune recette complète pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {/* Niveau 1 — Faisable maintenant */}
          {lvl1.length > 0 && (
            <section>
              <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                Faisable maintenant ({lvl1.length})
              </p>
              {lvl1.map(recipe => (
                <RecipeRow key={recipe.id} recipe={recipe} onAdd={() => setAddRecipe(recipe)} />
              ))}
            </section>
          )}

          {/* Niveau 2 — Presque prête */}
          {lvl2.length > 0 && (
            <section className="mt-4">
              <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                Presque prêtes ({lvl2.length})
              </p>
              {lvl2.map(recipe => (
                <RecipeRow key={recipe.id} recipe={recipe} onAdd={() => setAddRecipe(recipe)} />
              ))}
            </section>
          )}
        </div>
      )}

      {addRecipe && (
        <AddToMenuSheet
          recipe={{ id: addRecipe.id, title: addRecipe.title, imageLocal: addRecipe.imageLocal, imageUrl: null, preparationTime: addRecipe.preparationTime, cookingTime: addRecipe.cookingTime, category: 'MAIN', description: null }}
          onConfirm={(_slot: PlanningSlotWithRecipe) => setAddRecipe(null)}
          onClose={() => setAddRecipe(null)}
        />
      )}
    </div>
  )
}

function RecipeRow({ recipe, onAdd }: { recipe: FeasibleRecipe; onAdd: () => void }) {
  const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)
  const isLvl1    = recipe.level === 1

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Image */}
      <div
        className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ width: 44, height: 44, background: 'var(--surface2)', border: '2px solid var(--border)' }}
      >
        {recipe.imageLocal ? (
          <img src={`${UPLOAD_BASE}/${recipe.imageLocal}`} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-lg font-bold" style={{ color: 'var(--muted)' }}>
            {recipe.title.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {recipe.title}
        </p>
        {isLvl1 ? (
          <span
            className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded-full mt-0.5"
            style={{ background: 'var(--success-dim, #d4fce8)', color: 'var(--success)' }}
          >
            ✓ Tout disponible
          </span>
        ) : (
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--warning, #f59e0b)' }}>
            Manque : {recipe.missing.join(', ')}
          </p>
        )}
        {totalTime > 0 && (
          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{totalTime} min</p>
        )}
      </div>

      {/* Bouton ajouter au menu */}
      <button
        onClick={onAdd}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-mono text-xs"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
      >
        <Plus size={12} /> Menu
      </button>
    </div>
  )
}
