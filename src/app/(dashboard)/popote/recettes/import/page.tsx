'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { JowSearch } from '@/components/popote/import/JowSearch'
import { IngredientMapper } from '@/components/popote/import/IngredientMapper'
import { RecipeForm } from '@/components/popote/recipes/RecipeForm'
import type { JowSearchResult } from '@/app/api/popote/import/search/route'
import type { ImportFetchResult } from '@/app/api/popote/import/fetch/route'
import type { Resolution } from '@/components/popote/import/IngredientMapper'
import type { ApiResponse } from '@/lib/popote/types'

type Step =
  | { kind: 'search' }
  | { kind: 'mapping';  fetchResult: ImportFetchResult }
  | { kind: 'form';     fetchResult: ImportFetchResult; resolutions: Resolution }

const STEP_LABELS: Record<Step['kind'], string> = {
  search:  'Recherche',
  mapping: 'Mapping',
  form:    'Édition',
}

/**
 * Page d'import Jow en 3 étapes :
 * 1. Recherche → sélection d'une recette Jow
 * 2. Mapping des ingrédients inconnus (si nécessaire)
 * 3. Formulaire d'édition pré-rempli → enregistrement
 */
export default function ImportPage() {
  const router = useRouter()
  const [step,    setStep]    = useState<Step>({ kind: 'search' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSelect(recipe: JowSearchResult) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/popote/import/fetch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(recipe),
      })
      const json = await res.json() as ApiResponse<ImportFetchResult>
      if (json.success && json.data) {
        const fetchResult = json.data
        const hasUnknown  = fetchResult.ingredients.some(i => !i.matchStatus.matched)
        if (hasUnknown) {
          setStep({ kind: 'mapping', fetchResult })
        } else {
          setStep({ kind: 'form', fetchResult, resolutions: {} })
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
    setStep({ kind: 'form', fetchResult: step.fetchResult, resolutions })
  }

  const stepKind = step.kind

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={() => router.back()} className="p-1 rounded-lg" style={{ color: 'var(--muted)' }}>
          <X size={20} />
        </button>
        <h1 className="flex-1 font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
          Importer depuis Jow
        </h1>
        {/* Indicateur d'étape */}
        <div className="flex items-center gap-1.5">
          {(['search', 'mapping', 'form'] as Step['kind'][]).map((k, i) => (
            <div
              key={k}
              className="flex items-center gap-1"
            >
              <div
                className="rounded-full"
                style={{
                  width:      8,
                  height:     8,
                  background: k === stepKind ? 'var(--accent)' : 'var(--border2)',
                }}
              />
            </div>
          ))}
          <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
            {STEP_LABELS[stepKind]}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">
        {error && (
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {step.kind === 'search' && (
          <JowSearch onSelect={handleSelect} loading={loading} />
        )}

        {step.kind === 'mapping' && (
          <IngredientMapper
            ingredients={step.fetchResult.ingredients}
            onDone={handleMappingDone}
          />
        )}

        {step.kind === 'form' && (
          <RecipeForm
            prefill={step.fetchResult}
            resolutions={step.resolutions}
          />
        )}
      </div>
    </div>
  )
}
