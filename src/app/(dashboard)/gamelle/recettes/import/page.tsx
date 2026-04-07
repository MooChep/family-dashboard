'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { RecipeSearchGrid } from '@/components/gamelle/recipes/RecipeSearchGrid'
import { IngredientMapper } from '@/components/gamelle/import/IngredientMapper'
import { RecipeForm } from '@/components/gamelle/recipes/RecipeForm'
import type { JowSearchResult } from '@/app/api/gamelle/import/search/route'
import type { ImportFetchResult } from '@/app/api/gamelle/import/fetch/route'
import type { Resolution } from '@/components/gamelle/import/IngredientMapper'
import type { ApiResponse, RecipeCardData } from '@/lib/gamelle/types'

type Step =
  | { kind: 'search' }
  | { kind: 'mapping';  fetchResult: ImportFetchResult }
  | { kind: 'form';     fetchResult: ImportFetchResult; resolutions: Resolution }

const STEP_LABELS: Record<Step['kind'], string> = {
  search:  'Recherche',
  mapping: 'Mapping',
  form:    'Édition',
}

const WIZARD_KEY = 'gamelle_import_wizard'

function saveWizard(step: Step) {
  try { sessionStorage.setItem(WIZARD_KEY, JSON.stringify(step)) } catch { /* ignore */ }
}

function clearWizard() {
  try { sessionStorage.removeItem(WIZARD_KEY) } catch { /* ignore */ }
}

function loadWizard(): Step {
  try {
    const raw = sessionStorage.getItem(WIZARD_KEY)
    if (raw) return JSON.parse(raw) as Step
  } catch { /* ignore */ }
  return { kind: 'search' }
}

/**
 * Page d'import Jow en 3 étapes :
 * 1. Recherche → sélection d'une recette Jow (via RecipeSearchGrid)
 * 2. Mapping des ingrédients inconnus (si nécessaire)
 * 3. Formulaire d'édition pré-rempli → enregistrement
 *
 * L'état du wizard est persisté en sessionStorage pour survivre à un changement d'onglet.
 */
export default function ImportPage() {
  const router = useRouter()
  const [step,    setStep]    = useState<Step>({ kind: 'search' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Carte id → JowSearchResult pour retrouver les données complètes depuis RecipeCardData
  const jowResultsRef = useRef<Map<string, JowSearchResult>>(new Map())

  // Restaurer l'état du wizard au montage
  useEffect(() => {
    const saved = loadWizard()
    if (saved.kind !== 'search') setStep(saved)
  }, [])

  function goToStep(s: Step) {
    setStep(s)
    saveWizard(s)
  }

  function handleCancel() {
    clearWizard()
    router.back()
  }

  /** Recherche Jow — appelé par RecipeSearchGrid via onFetch */
  async function fetchJowRecipes(query: string): Promise<RecipeCardData[]> {
    const q = query.trim()
    if (!q) return []
    const res = await fetch('/api/gamelle/import/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q, limit: 20 }),
    })
    const json = await res.json() as ApiResponse<JowSearchResult[]>
    if (!json.success || !json.data) return []

    // Stocker les résultats complets pour lookup ultérieur
    for (const r of json.data) jowResultsRef.current.set(r.id, r)

    // Mapper vers RecipeCardData
    return json.data.map(r => ({
      id:              r.id,
      title:           r.name,
      imageUrl:        r.imageUrl,
      imageLocal:      null,
      preparationTime: r.preparationTime,
      cookingTime:     r.cookingTime,
      category:        null,
      description:     r.description,
    }))
  }

  /** Sélection d'une recette Jow → fetch détails + ingrédients */
  async function handleSelect(card: RecipeCardData) {
    const jowRecipe = jowResultsRef.current.get(card.id)
    if (!jowRecipe) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gamelle/import/fetch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(jowRecipe),
      })
      const json = await res.json() as ApiResponse<ImportFetchResult>
      if (json.success && json.data) {
        const fetchResult = json.data
        const hasUnknown  = fetchResult.ingredients.some(i => !i.matchStatus.matched)
        if (hasUnknown) {
          goToStep({ kind: 'mapping', fetchResult })
        } else {
          goToStep({ kind: 'form', fetchResult, resolutions: {} })
        }
      } else {
        setError(json.error ?? 'Erreur lors de la récupération.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  function handleMappingDone(resolutions: Resolution) {
    if (step.kind !== 'mapping') return
    goToStep({ kind: 'form', fetchResult: step.fetchResult, resolutions })
  }

  const stepKind = step.kind

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={handleCancel} className="p-1 rounded-lg" style={{ color: 'var(--muted)' }}>
          <X size={20} />
        </button>
        <h1 className="flex-1 font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
          Importer depuis Jow
        </h1>
        {/* Indicateur d'étape */}
        <div className="flex items-center gap-1.5">
          {(['search', 'mapping', 'form'] as Step['kind'][]).map(k => (
            <div key={k}
              className="rounded-full"
              style={{
                width:      8,
                height:     8,
                background: k === stepKind ? 'var(--accent)' : 'var(--border2)',
              }}
            />
          ))}
          <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
            {STEP_LABELS[stepKind]}
          </span>
        </div>
      </div>

      {/* Contenu */}
      {error && (
        <p className="font-mono text-xs px-4 pt-3" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      {step.kind === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading && (
            <p className="font-mono text-xs px-4 pt-2" style={{ color: 'var(--muted)' }}>Chargement…</p>
          )}
          <RecipeSearchGrid
            title=""
            mode="import"
            onFetch={fetchJowRecipes}
            onSelect={handleSelect}
          />
        </div>
      )}

      {step.kind === 'mapping' && (
        <div className="flex-1 px-4 py-5 pb-24 overflow-y-auto">
          <IngredientMapper
            ingredients={step.fetchResult.ingredients}
            onDone={handleMappingDone}
          />
        </div>
      )}

      {step.kind === 'form' && (
        <div className="flex-1 px-4 py-5 pb-24 overflow-y-auto">
          <RecipeForm
            prefill={step.fetchResult}
            resolutions={step.resolutions}
            onSuccess={clearWizard}
          />
        </div>
      )}
    </div>
  )
}
