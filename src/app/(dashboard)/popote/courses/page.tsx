'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { CheckPlacard } from '@/components/popote/shopping/CheckPlacard'
import type { ShoppingItem } from '@/components/popote/shopping/CheckPlacard'

type ShoppingList = {
  id:          string
  generatedAt: string
  items:       ShoppingItem[]
}

type View = 'check-placard' | 'shopping-list'

/**
 * Page principale des courses.
 * Enchaîne : génération → check placard → liste finale (S18).
 */
export default function CoursesPage() {
  const [list,        setList]        = useState<ShoppingList | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [view,        setView]        = useState<View>('check-placard')

  useEffect(() => { void loadCurrent() }, [])

  async function loadCurrent() {
    setLoading(true)
    try {
      const res  = await fetch('/api/popote/shopping/current')
      const data = await res.json() as ShoppingList | null
      setList(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res  = await fetch('/api/popote/shopping/generate', { method: 'POST' })
      const data = await res.json() as ShoppingList
      setList(data)
      setView('check-placard')
    } catch { /* ignore */ } finally {
      setGenerating(false)
    }
  }

  async function handleToggleSkip(id: string) {
    if (!list) return
    // Optimiste
    setList(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, skipped: !i.skipped } : i),
    } : null)
    try {
      await fetch(`/api/popote/shopping/items/${id}/skip`, { method: 'PATCH' })
    } catch {
      await loadCurrent()   // rollback
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <Header onGenerate={handleGenerate} generating={generating} hasList={false} />
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <Header onGenerate={handleGenerate} generating={generating} hasList={false} />
        <div className="flex flex-col items-center justify-center gap-4 flex-1 px-8 text-center">
          <span className="text-4xl">🛒</span>
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
            Aucune liste de courses
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
            Génère une liste depuis les recettes de ton menu.
          </p>
          <button
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="px-5 py-3 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {generating ? 'Génération…' : 'Générer la liste'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header onGenerate={handleGenerate} generating={generating} hasList />

      <div className="flex-1 overflow-y-auto">
        {view === 'check-placard' ? (
          <CheckPlacard
            items={list.items.filter(i => !i.purchased)}
            onToggleSkip={handleToggleSkip}
            onDone={() => setView('shopping-list')}
          />
        ) : (
          <ShoppingListView
            items={list.items.filter(i => !i.skipped)}
            onGenerate={handleGenerate}
            generating={generating}
          />
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Header({ onGenerate, generating, hasList }: { onGenerate: () => void; generating: boolean; hasList: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
        Courses
      </h1>
      {hasList && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs disabled:opacity-40"
          style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
          Regénérer
        </button>
      )}
    </div>
  )
}

/** Vue liste finale — placeholder simple, remplacé par SmartSwipe en S18. */
function ShoppingListView({
  items,
  onGenerate,
  generating,
}: {
  items:      ShoppingItem[]
  onGenerate: () => void
  generating: boolean
}) {
  const purchased = items.filter(i => i.purchased).length
  const total     = items.length

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
        <span className="text-3xl">✓</span>
        <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
          Liste vide
        </p>
        <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
          Tout est coché ou le stock couvre les besoins.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="mt-2 px-4 py-2 rounded-xl font-mono text-xs disabled:opacity-40"
          style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          Regénérer
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-4">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{total} articles</span>
        {purchased > 0 && (
          <span className="font-mono text-xs" style={{ color: 'var(--success)' }}>{purchased} achetés ✓</span>
        )}
      </div>
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', opacity: item.purchased ? 0.5 : 1 }}
        >
          <div
            className="shrink-0 w-5 h-5 rounded"
            style={{
              border:     `1.5px solid ${item.purchased ? 'var(--success)' : 'var(--border2)'}`,
              background:  item.purchased ? 'var(--success)' : 'transparent',
            }}
          />
          <span className="flex-1 font-body text-sm" style={{
            color:          item.purchased ? 'var(--muted)' : 'var(--text)',
            textDecoration: item.purchased ? 'line-through' : 'none',
          }}>
            {item.label}
          </span>
          {item.quantity !== null && (
            <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
              {item.quantity}{item.displayUnit ? ` ${item.displayUnit}` : ''}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
