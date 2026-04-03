'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Suggestion } from '@/app/api/gamelle/suggestions/route'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

function SuggestionCard({ s }: { s: Suggestion }) {
  return (
    <Link href={`/gamelle/recettes`}>
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* Image */}
        <div
          className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
          style={{ width: 40, height: 40, background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          {s.recipe.imageLocal ? (
            <img src={`${UPLOAD_BASE}/${s.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {s.recipe.title.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {s.recipe.title}
          </p>
          {s.level === 1 ? (
            <p className="font-mono text-[10px]" style={{ color: 'var(--success)' }}>
              Faisable maintenant ✓
            </p>
          ) : (
            <p className="font-mono text-[10px]" style={{ color: 'var(--warning)' }}>
              Manque : {s.missing.map(m => m.name).join(' · ')}
            </p>
          )}
        </div>

        {/* Badge niveau */}
        <span
          className="shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full"
          style={{
            background: s.level === 1 ? 'rgba(var(--success-rgb, 34,197,94), 0.12)' : 'rgba(201,168,76,0.12)',
            color:      s.level === 1 ? 'var(--success)' : 'var(--warning)',
          }}
        >
          Lv{s.level}
        </span>
      </div>
    </Link>
  )
}

interface SuggestionsPanelProps {
  limit?: number
}

/**
 * Panneau suggestions anti-gaspillage.
 * Affiche les recettes faisables ou presque depuis le stock.
 */
export function SuggestionsPanel({ limit }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/gamelle/suggestions')
        const data = await res.json() as Suggestion[]
        setSuggestions(Array.isArray(data) ? data : [])
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return null

  if (suggestions.length === 0) {
    return (
      <p className="font-mono text-xs px-4 py-3" style={{ color: 'var(--muted)' }}>
        Rien à cuisiner avec le stock actuel — faites les courses !
      </p>
    )
  }

  const displayed = limit ? suggestions.slice(0, limit) : suggestions

  return (
    <div>
      {displayed.map(s => <SuggestionCard key={s.recipe.id} s={s} />)}
      {limit && suggestions.length > limit && (
        <Link
          href="/gamelle"
          className="block px-4 py-2 font-mono text-xs text-center"
          style={{ color: 'var(--accent)' }}
        >
          +{suggestions.length - limit} de plus →
        </Link>
      )}
    </div>
  )
}
