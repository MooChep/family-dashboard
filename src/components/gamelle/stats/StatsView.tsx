'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { GamelleStats } from '@/app/api/gamelle/stats/route'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

function StatCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl px-4 py-4 flex flex-col gap-2"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}

function BigNumber({ value }: { value: number | string }) {
  return (
    <span className="font-display font-bold" style={{ fontSize: '2rem', lineHeight: 1, color: 'var(--text)' }}>
      {value}
    </span>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
      {children}
    </span>
  )
}

function formatSince(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Vue statistiques lifetime du module Gamelle.
 */
export function StatsView() {
  const router = useRouter()
  const [stats,   setStats]   = useState<GamelleStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/gamelle/stats')
        const data = await res.json() as GamelleStats
        setStats(data)
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
  }

  if (!stats) {
    return <p className="font-mono text-xs p-4" style={{ color: 'var(--danger)' }}>Erreur de chargement.</p>
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={() => router.back()} className="p-1" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Statistiques
        </h1>
      </div>
    <div className="flex flex-col gap-4 px-4 py-4">

      {/* Recettes */}
      <StatCard>
        <Label>Recettes cuisinées</Label>
        <BigNumber value={stats.recipesCooked} />
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          sur {stats.totalRecipes} recette{stats.totalRecipes !== 1 ? 's' : ''} connues
        </p>
      </StatCard>

      {/* Top 5 recettes */}
      {stats.mostCookedRecipes.length > 0 && (
        <StatCard>
          <Label>Recettes préférées</Label>
          <div className="flex flex-col gap-2 mt-1">
            {stats.mostCookedRecipes.map((entry, i) => (
              <div key={entry.recipe.id} className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold w-5 shrink-0" style={{ color: 'var(--muted)' }}>
                  {i + 1}.
                </span>
                <div
                  className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ width: 28, height: 28, background: 'var(--surface2)', border: '1px solid var(--border)' }}
                >
                  {entry.recipe.imageLocal ? (
                    <img src={`${UPLOAD_BASE}/${entry.recipe.imageLocal}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display text-xs font-bold" style={{ color: 'var(--muted)' }}>
                      {entry.recipe.title.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="flex-1 font-body text-sm truncate" style={{ color: 'var(--text)' }}>
                  {entry.recipe.title}
                </span>
                <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                  × {entry.count}
                </span>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* Courses */}
      <StatCard>
        <Label>Courses</Label>
        <div className="flex gap-6">
          <div className="flex flex-col">
            <BigNumber value={stats.shoppingListsCompleted} />
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              liste{stats.shoppingListsCompleted !== 1 ? 's' : ''} complète{stats.shoppingListsCompleted !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col">
            <BigNumber value={stats.itemsPurchased} />
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              article{stats.itemsPurchased !== 1 ? 's' : ''} acheté{stats.itemsPurchased !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </StatCard>

      {/* Portions */}
      <StatCard>
        <Label>Portions cuisinées</Label>
        <BigNumber value={stats.portionsConsumedTotal} />
        {stats.since && (
          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
            depuis le {formatSince(stats.since)}
          </p>
        )}
      </StatCard>

      {/* Menu actif */}
      <StatCard>
        <Label>Menu actif</Label>
        <BigNumber value={stats.slotsActive} />
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          recette{stats.slotsActive !== 1 ? 's' : ''} au panier
        </p>
      </StatCard>

    </div>
    </div>
  )
}
