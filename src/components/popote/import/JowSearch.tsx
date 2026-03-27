'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { ApiResponse } from '@/lib/popote/types'
import type { JowSearchResult } from '@/app/api/popote/import/search/route'

interface JowSearchProps {
  onSelect: (recipe: JowSearchResult) => void
  loading:  boolean
}

/**
 * Étape 1 — Recherche Jow.
 * Affiche un champ de recherche + liste de résultats.
 * Appelle `onSelect` quand l'utilisateur choisit une recette.
 */
export function JowSearch({ onSelect, loading }: JowSearchProps) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<JowSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError('')
    try {
      const res = await fetch('/api/popote/import/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ q, limit: 10 }),
      })
      const json = await res.json() as ApiResponse<JowSearchResult[]>
      if (json.success && json.data) {
        setResults(json.data)
        if (json.data.length === 0) setError('Aucun résultat.')
      } else {
        setError(json.error ?? 'Erreur de recherche.')
      }
    } catch {
      setError('Microservice indisponible.')
    } finally {
      setSearching(false)
    }
  }

  const totalTime = (r: JowSearchResult) =>
    (r.preparationTime ?? 0) + (r.cookingTime ?? 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Champ de recherche */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <Search size={14} style={{ color: 'var(--muted)' }} />
          <input
            className="flex-1 bg-transparent font-body text-sm outline-none"
            style={{ color: 'var(--text)' }}
            placeholder="poulet rôti, carbonara…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSearch() }}
          />
        </div>
        <button
          onClick={() => void handleSearch()}
          disabled={searching || !query.trim()}
          className="px-4 py-2 rounded-xl font-mono text-sm disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {searching ? '…' : 'Chercher'}
        </button>
      </div>

      {error && (
        <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      {/* Résultats */}
      {results.length > 0 && (
        <div className="flex flex-col" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {results.map(recipe => (
            <div
              key={recipe.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {/* Image / placeholder */}
              <div
                className="shrink-0 rounded-lg flex items-center justify-center font-display text-xl"
                style={{ width: 44, height: 44, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  (recipe.name ?? '?').charAt(0)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {recipe.name}
                </p>
                <div className="flex gap-3 mt-0.5">
                  {totalTime(recipe) > 0 && (
                    <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>⏱ {totalTime(recipe)} min</span>
                  )}
                  {recipe.coversCount && (
                    <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>👥 {recipe.coversCount}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelect(recipe)}
                disabled={loading}
                className="shrink-0 px-3 py-1.5 rounded-lg font-mono text-xs disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {loading ? '…' : 'Choisir'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
